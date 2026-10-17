import {
  AccountStatus,
  AdminRole,
  InstallmentStatus,
  LedgerTransactionKind,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  PlanCode,
} from "@tranche/shared";
import { isoDaysFromToday } from "@/common/helpers/dates";
import { ReminderService } from "@/core/billing/reminder.service";
import { DelinquencyService } from "@/core/billing/delinquency.service";
import { AutoChargeService } from "@/core/billing/auto-charge.service";
import { Installment, Notification, Order } from "@/database/entities";
import {
  api,
  checkoutAndPay,
  dataSource,
  get,
  makeAdmin,
  makeCustomer,
  makeMerchant,
  makeProduct,
  push,
  start,
  stop,
  trialBalance,
} from "./harness";

beforeAll(start);
afterAll(stop);

const setDue = (installmentId: string, dueDate: string) =>
  dataSource.getRepository(Installment).update(installmentId, { dueDate });

describe("admin api", () => {
  it("is staff-only and tiered by staff role", async () => {
    const shopper = await makeCustomer();
    const support = await makeAdmin(AdminRole.SUPPORT);
    const superAdmin = await makeAdmin(AdminRole.SUPER_ADMIN);

    expect((await api(shopper, "GET", "/admin/dashboard")).status).toBe(403);
    expect((await api(support, "GET", "/admin/dashboard")).status).toBe(200);
    expect((await api(support, "PATCH", "/admin/settings", { graceDays: 5 })).status).toBe(403);

    const updated = await api(superAdmin, "PATCH", "/admin/settings", { graceDays: 5 });
    expect(updated.body.response.graceDays).toBe(5);
    expect((await api(support, "GET", "/admin/settings")).body.response.graceDays).toBe(5);

    const invalid = await api(superAdmin, "PATCH", "/admin/settings", { enabledPlans: [] });
    expect(invalid.status).toBe(400);
    await api(superAdmin, "PATCH", "/admin/settings", { graceDays: 3 });
  });

  it("maintenance mode closes shopper routes but not staff ones", async () => {
    const superAdmin = await makeAdmin();
    const shopper = await makeCustomer();
    await api(superAdmin, "PATCH", "/admin/settings", { maintenanceMode: true });
    const closed = await api(shopper, "GET", "/customer/products");
    expect(closed.status).toBe(503);
    expect(closed.body.error.code).toBe("MAINTENANCE_MODE");
    expect((await api(superAdmin, "GET", "/admin/orders")).status).toBe(200);
    await api(superAdmin, "PATCH", "/admin/settings", { maintenanceMode: false });
    expect((await api(shopper, "GET", "/customer/products")).status).toBe(200);
  });

  it("manages merchants and customers", async () => {
    const admin = await makeAdmin(AdminRole.ADMIN);
    const owner = await makeMerchant();
    const shopper = await makeCustomer();

    const merchants = (await api(admin, "GET", `/admin/merchants?search=${owner.merchant.name}`)).body.response;
    expect(merchants.data[0]).toMatchObject({ id: owner.merchant.id, ownerEmail: owner.user.email, feeBps: 500 });

    expect((await api(admin, "PATCH", `/admin/merchants/${owner.merchant.id}/fee`, { feeBps: 300 })).status).toBe(403);
    const suspended = await api(admin, "PATCH", `/admin/merchants/${owner.merchant.id}/status`, {
      status: "suspended",
    });
    expect(suspended.body.response.status).toBe("suspended");

    const limit = await api(admin, "PATCH", `/admin/customers/${shopper.user.id}`, { creditLimitKobo: 42_000_00 });
    expect(limit.body.response.creditLimitKobo).toBe(42_000_00);
    await api(admin, "PATCH", `/admin/customers/${shopper.user.id}`, { status: AccountStatus.SUSPENDED });
    expect((await api(shopper, "GET", "/customer/summary")).status).toBe(401);

    const audit = (await api(admin, "GET", "/admin/audit-logs?search=customer.update")).body.response;
    expect(audit.data.length).toBeGreaterThanOrEqual(2);
  });

  it("can cancel unfunded orders only, and exposes the ledger", async () => {
    const admin = await makeAdmin(AdminRole.ADMIN);
    const owner = await makeMerchant();
    const product = await makeProduct(owner.merchant.id);
    const shopper = await makeCustomer();

    const pending = await api(shopper, "POST", "/customer/checkout", {
      items: [{ productId: product.id, quantity: 1 }],
      planCode: PlanCode.PAY_IN_4,
    });
    const cancelled = await api(admin, "POST", `/admin/orders/${pending.body.response.order.id}/cancel`);
    expect(cancelled.body.response.status).toBe(OrderStatus.CANCELLED);
    expect(cancelled.body.response.installments.every((i: any) => i.status === InstallmentStatus.CANCELLED)).toBe(true);

    const { checkout } = await checkoutAndPay(shopper, product.id);
    expect((await api(admin, "POST", `/admin/orders/${checkout.order.id}/cancel`)).status).toBe(409);

    const txns = (await api(admin, "GET", `/admin/ledger/transactions?kind=${LedgerTransactionKind.ORDER_FINANCED}`))
      .body.response;
    const financed = txns.data.find((t: any) => t.reference === checkout.order.id);
    const debits = financed.entries
      .filter((e: any) => e.direction === "debit")
      .reduce((t: number, e: any) => t + e.amountKobo, 0);
    const credits = financed.entries
      .filter((e: any) => e.direction === "credit")
      .reduce((t: number, e: any) => t + e.amountKobo, 0);
    expect(debits).toBe(credits);

    const accounts = (await api(admin, "GET", "/admin/ledger/accounts?ownerType=platform")).body.response;
    expect(accounts.data.map((a: any) => a.code)).toEqual(
      expect.arrayContaining(["platform:clearing", "platform:fee_revenue", "platform:late_fee_revenue"]),
    );

    const dashboard = (await api(admin, "GET", "/admin/dashboard?days=7")).body.response;
    expect(dashboard.gmvKobo).toBeGreaterThan(0);
    expect(dashboard.series).toHaveLength(7);
  });

  it("the database rejects unbalanced or edited ledger entries", async () => {
    const [account] = await dataSource.query("SELECT id FROM ledger_accounts LIMIT 1");
    const unbalanced = dataSource.transaction(async (m) => {
      const [tx] = await m.query(
        `INSERT INTO ledger_transactions (kind, reference, description) VALUES ('payout', 'manual-hack', 'x') RETURNING id`,
      );
      await m.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, direction, amount_kobo) VALUES ($1, $2, 'debit', 100)`,
        [tx.id, account.id],
      );
    });
    await expect(unbalanced).rejects.toThrow(/unbalanced/);
    await expect(dataSource.query("UPDATE ledger_entries SET amount_kobo = amount_kobo + 1")).rejects.toThrow(
      /append-only/,
    );
  });
});

describe("background jobs", () => {
  it("sends due-soon, due-today and overdue reminders once", async () => {
    const owner = await makeMerchant();
    const product = await makeProduct(owner.merchant.id, { priceKobo: 40_000_00 });
    const shopper = await makeCustomer();
    await api(shopper, "POST", "/notifications/device-tokens", {
      platform: "ios",
      token: "ExponentPushToken[abc123def456]",
    });
    const { checkout } = await checkoutAndPay(shopper, product.id);
    const [, second, third] = checkout.order.installments;
    await setDue(second.id, isoDaysFromToday(3));
    await setDue(third.id, isoDaysFromToday(0));

    const reminders = get<ReminderService>(ReminderService);
    const pushesBefore = push.sent.length;
    const first = await reminders.sendDueReminders();
    expect(first[NotificationType.INSTALLMENT_DUE_SOON]).toBeGreaterThanOrEqual(1);
    expect(first[NotificationType.INSTALLMENT_DUE_TODAY]).toBeGreaterThanOrEqual(1);
    expect(push.sent.length).toBeGreaterThan(pushesBefore);
    expect(push.sent.at(-1)?.tokens).toEqual(["ExponentPushToken[abc123def456]"]);

    const inbox = await dataSource
      .getRepository(Notification)
      .find({ where: { userId: shopper.user.id }, order: { createdAt: "DESC" } });
    expect(inbox.map((n) => n.type)).toEqual(
      expect.arrayContaining([NotificationType.INSTALLMENT_DUE_SOON, NotificationType.INSTALLMENT_DUE_TODAY]),
    );

    const again = await reminders.sendDueReminders();
    const mine = await dataSource.getRepository(Notification).count({ where: { userId: shopper.user.id } });
    expect(mine).toBe(inbox.length);
    expect(again[NotificationType.INSTALLMENT_DUE_SOON]).toBe(0);
  });

  it("marks past-due installments overdue, charges a late fee once after grace, and stays balanced", async () => {
    const owner = await makeMerchant();
    const product = await makeProduct(owner.merchant.id, { priceKobo: 40_000_00 });
    const shopper = await makeCustomer();
    const { checkout } = await checkoutAndPay(shopper, product.id);
    const second = checkout.order.installments[1];
    await setDue(second.id, isoDaysFromToday(-10));

    const sweep = get<DelinquencyService>(DelinquencyService);
    await sweep.sweep();
    await sweep.sweep();

    const order = (await api(shopper, "GET", `/customer/orders/${checkout.order.id}`)).body.response;
    expect(order.status).toBe(OrderStatus.OVERDUE);
    expect(order.installments[1]).toMatchObject({
      status: InstallmentStatus.OVERDUE,
      amountKobo: 10_000_00 + 1_000_00,
    });
    const fees = await dataSource.query(
      `SELECT COUNT(*)::int AS n FROM ledger_transactions WHERE kind = 'late_fee' AND reference = $1`,
      [second.id],
    );
    expect(fees[0].n).toBe(1);
    expect((await trialBalance()).balanced).toBe(true);

    // Paying the overdue installment (with its fee) brings the order back to active.
    const pay = await api(shopper, "POST", `/customer/installments/${second.id}/pay`, {});
    expect(pay.body.response.status).toBe(PaymentStatus.SUCCESS);
    const after = (await api(shopper, "GET", `/customer/orders/${checkout.order.id}`)).body.response;
    expect(after.status).toBe(OrderStatus.ACTIVE);
    expect((await trialBalance()).balanced).toBe(true);
  });

  it("auto-charges installments that come due, and cancels checkouts never paid", async () => {
    const owner = await makeMerchant();
    const product = await makeProduct(owner.merchant.id, { priceKobo: 40_000_00 });
    const shopper = await makeCustomer();
    const { checkout } = await checkoutAndPay(shopper, product.id);
    await setDue(checkout.order.installments[1].id, isoDaysFromToday(0));

    const autoCharge = get<AutoChargeService>(AutoChargeService);
    const due = await autoCharge.findDue();
    expect(due).toContain(checkout.order.installments[1].id);
    for (const id of due) await autoCharge.charge(id);
    expect(await autoCharge.findDue()).not.toContain(checkout.order.installments[1].id);

    const order = (await api(shopper, "GET", `/customer/orders/${checkout.order.id}`)).body.response;
    expect(order.installments[1].status).toBe(InstallmentStatus.PAID);

    const stale = await api(shopper, "POST", "/customer/checkout", {
      items: [{ productId: product.id, quantity: 1 }],
      planCode: PlanCode.MONTHLY_3,
    });
    await dataSource.query(`UPDATE orders SET created_at = now() - interval '2 days' WHERE id = $1`, [
      stale.body.response.order.id,
    ]);
    const result = await get<DelinquencyService>(DelinquencyService).sweep();
    expect(result.cancelledCheckouts).toBeGreaterThanOrEqual(1);
    const cancelled = await dataSource.getRepository(Order).findOneByOrFail({ id: stale.body.response.order.id });
    expect(cancelled.status).toBe(OrderStatus.CANCELLED);
  });
});
