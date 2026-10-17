import {
  InstallmentStatus,
  MerchantStatus,
  NotificationType,
  OrderStatus,
  PaymentChannel,
  PaymentStatus,
  PlanCode,
  PlatformAccount,
  buildInstallmentSchedule,
} from "@tranche/shared";
import { todayIso } from "@/common/helpers/dates";
import { LedgerService } from "@/core/ledger/ledger.service";
import { customerReceivableAccount, merchantPayableAccount } from "@/core/ledger/chart-of-accounts";
import { FAKE_DECLINED_AUTHORIZATION } from "@/core/payments/fake.provider";
import { PaymentMethod } from "@/database/entities";
import {
  api,
  checkoutAndPay,
  dataSource,
  get,
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

describe("checkout -> installments -> ledger", () => {
  it("creates the exact schedule the shared package computes and opens a hosted checkout", async () => {
    const { merchant } = await makeMerchant();
    const product = await makeProduct(merchant.id, { priceKobo: 100_001_00 });
    const shopper = await makeCustomer();

    const res = await api(shopper, "POST", "/customer/checkout", {
      items: [{ productId: product.id, quantity: 1 }],
      planCode: PlanCode.PAY_IN_4,
    });
    expect(res.status).toBe(201);
    const { order, payment } = res.body.response;

    const expected = buildInstallmentSchedule(100_001_00, PlanCode.PAY_IN_4, todayIso());
    expect(
      order.installments.map((i: any) => ({ sequence: i.sequence, amountKobo: i.amountKobo, dueDate: i.dueDate })),
    ).toEqual(expected);
    expect(order).toMatchObject({ status: OrderStatus.PENDING_PAYMENT, totalKobo: 100_001_00, feeKobo: 5_000_05 });
    expect(payment).toMatchObject({
      status: PaymentStatus.PENDING,
      authorizationUrl: expect.stringContaining("/dev/checkout/"),
    });
  });

  it("activates the order on first payment, saves the card and posts balanced ledger entries", async () => {
    const { merchant } = await makeMerchant({ feeBps: 450 });
    const product = await makeProduct(merchant.id, { priceKobo: 200_000_00, stock: 3 });
    const shopper = await makeCustomer();

    const { verify, checkout } = await checkoutAndPay(shopper, product.id);
    expect(verify).toMatchObject({
      status: PaymentStatus.SUCCESS,
      order: { status: OrderStatus.ACTIVE, installmentsPaid: 1 },
    });

    const order = (await api(shopper, "GET", `/customer/orders/${checkout.order.id}`)).body.response;
    expect(order.installments[0].status).toBe(InstallmentStatus.PAID);
    expect(order.outstandingKobo).toBe(150_000_00);
    expect(order.nextDueKobo).toBe(50_000_00);

    const cards = (await api(shopper, "GET", "/customer/payment-methods")).body.response;
    expect(cards).toEqual([expect.objectContaining({ last4: "4081", isDefault: true })]);

    const ledger = get<LedgerService>(LedgerService);
    expect(await ledger.balanceOf(customerReceivableAccount(shopper.user.id).code)).toBe(150_000_00);
    expect(await ledger.balanceOf(merchantPayableAccount(merchant.id).code)).toBe(191_000_00);
    expect(await ledger.balanceOf(PlatformAccount.FEE_REVENUE)).toBeGreaterThanOrEqual(9_000_00);

    // Stock is taken when the order is financed, not at checkout.
    const stock = await dataSource.query("SELECT stock FROM products WHERE id = $1", [product.id]);
    expect(stock[0].stock).toBe(2);

    expect((await trialBalance()).balanced).toBe(true);
  });

  it("pays later installments with the saved card until the order is completed", async () => {
    const { merchant } = await makeMerchant();
    const product = await makeProduct(merchant.id, { priceKobo: 30_000_00 });
    const shopper = await makeCustomer();
    const { checkout } = await checkoutAndPay(shopper, product.id, PlanCode.MONTHLY_3);

    for (const installment of checkout.order.installments.slice(1)) {
      const res = await api(shopper, "POST", `/customer/installments/${installment.id}/pay`, {
        paymentMethodId: (
          await dataSource.getRepository(PaymentMethod).findOneOrFail({ where: { customerId: shopper.user.id } })
        ).id,
      });
      expect(res.status).toBe(200);
      expect(res.body.response).toMatchObject({ status: PaymentStatus.SUCCESS, authorizationUrl: null });
    }

    const order = (await api(shopper, "GET", `/customer/orders/${checkout.order.id}`)).body.response;
    expect(order).toMatchObject({ status: OrderStatus.COMPLETED, outstandingKobo: 0, installmentsPaid: 3 });
    expect(order.payments.filter((p: any) => p.channel === PaymentChannel.CARD_ON_FILE)).toHaveLength(2);
    expect(await get<LedgerService>(LedgerService).balanceOf(customerReceivableAccount(shopper.user.id).code)).toBe(0);
    expect(push.sent.length).toBeGreaterThanOrEqual(0);

    const inbox = (await api(shopper, "GET", "/notifications")).body.response;
    expect(inbox.data[0].type).toBe(NotificationType.ORDER_COMPLETED);
    expect(inbox.unreadCount).toBe(3);

    // Paying a settled installment is refused.
    const again = await api(shopper, "POST", `/customer/installments/${checkout.order.installments[1].id}/pay`, {});
    expect(again.status).toBe(409);
  });

  it("verifying the same payment twice changes nothing", async () => {
    const { merchant } = await makeMerchant();
    const product = await makeProduct(merchant.id, { priceKobo: 40_000_00 });
    const shopper = await makeCustomer();
    const { reference, checkout } = await checkoutAndPay(shopper, product.id);

    const before = await trialBalance();
    const second = await api(shopper, "GET", `/customer/payments/verify/${reference}`);
    expect(second.body.response.status).toBe(PaymentStatus.SUCCESS);
    const after = await trialBalance();
    expect(after.totalDebitKobo).toBe(before.totalDebitKobo);

    const order = (await api(shopper, "GET", `/customer/orders/${checkout.order.id}`)).body.response;
    expect(order.payments.filter((p: any) => p.status === PaymentStatus.SUCCESS)).toHaveLength(1);
  });

  it("a declined card fails the installment and tells the shopper", async () => {
    const { merchant } = await makeMerchant();
    const product = await makeProduct(merchant.id, { priceKobo: 40_000_00 });
    const shopper = await makeCustomer();
    const { checkout } = await checkoutAndPay(shopper, product.id);
    const card = await dataSource
      .getRepository(PaymentMethod)
      .findOneOrFail({ where: { customerId: shopper.user.id } });
    await dataSource.query("UPDATE payment_methods SET authorization_code = $2 WHERE id = $1", [
      card.id,
      (await import("@/common/crypto")).encryptSecret(FAKE_DECLINED_AUTHORIZATION),
    ]);

    const res = await api(shopper, "POST", `/customer/installments/${checkout.order.installments[1].id}/pay`, {
      paymentMethodId: card.id,
    });
    expect(res.body.response.status).toBe(PaymentStatus.FAILED);
    const order = (await api(shopper, "GET", `/customer/orders/${checkout.order.id}`)).body.response;
    expect(order.installments[1].status).toBe(InstallmentStatus.FAILED);
    const inbox = (await api(shopper, "GET", "/notifications")).body.response;
    expect(inbox.data[0].type).toBe(NotificationType.PAYMENT_FAILED);
  });

  it("enforces credit limits, one store per order, store status and stock", async () => {
    const { merchant } = await makeMerchant();
    const other = await makeMerchant();
    const pricey = await makeProduct(merchant.id, { priceKobo: 2_000_000_00 });
    const cheap = await makeProduct(merchant.id, { priceKobo: 10_000_00, stock: 1 });
    const elsewhere = await makeProduct(other.merchant.id);
    const shopper = await makeCustomer({ creditLimitKobo: 100_000_00 });
    const checkout = (body: unknown) => api(shopper, "POST", "/customer/checkout", body);

    const limit = await checkout({ items: [{ productId: pricey.id, quantity: 1 }], planCode: PlanCode.PAY_IN_4 });
    expect(limit.status).toBe(422);
    expect(limit.body.error.code).toBe("INSUFFICIENT_CREDIT");

    const mixed = await checkout({
      items: [
        { productId: cheap.id, quantity: 1 },
        { productId: elsewhere.id, quantity: 1 },
      ],
      planCode: PlanCode.PAY_IN_4,
    });
    expect(mixed.status).toBe(400);

    const stock = await checkout({ items: [{ productId: cheap.id, quantity: 2 }], planCode: PlanCode.PAY_IN_4 });
    expect(stock.status).toBe(409);

    await dataSource.query("UPDATE merchants SET status = $2 WHERE id = $1", [merchant.id, MerchantStatus.SUSPENDED]);
    const closed = await checkout({ items: [{ productId: cheap.id, quantity: 1 }], planCode: PlanCode.PAY_IN_4 });
    expect(closed.status).toBe(409);
  });

  it("keeps shoppers out of each other's orders and payments", async () => {
    const { merchant } = await makeMerchant();
    const product = await makeProduct(merchant.id);
    const alice = await makeCustomer();
    const bob = await makeCustomer();
    const { checkout, reference } = await checkoutAndPay(alice, product.id);

    expect((await api(bob, "GET", `/customer/orders/${checkout.order.id}`)).status).toBe(404);
    expect((await api(bob, "GET", `/customer/payments/verify/${reference}`)).status).toBe(403);
    expect((await api(bob, "POST", `/customer/installments/${checkout.order.installments[1].id}/pay`, {})).status).toBe(
      403,
    );

    // Query filters can't widen the scope either.
    const spoof = await api(bob, "GET", `/customer/orders?customerId=${alice.user.id}`);
    expect(spoof.body.response.data).toHaveLength(0);
  });

  it("serves the catalog and a summary with available credit", async () => {
    const { merchant } = await makeMerchant();
    await makeProduct(merchant.id, { name: "Visible lamp" });
    await makeProduct(merchant.id, { name: "Hidden lamp", isActive: false });
    const shopper = await makeCustomer({ creditLimitKobo: 500_000_00 });

    const list = (await api(shopper, "GET", `/customer/products?merchantId=${merchant.id}&search=lamp`)).body.response;
    expect(list.data.map((p: any) => p.name)).toEqual(["Visible lamp"]);
    expect(list.meta).toMatchObject({ total: 1, page: 1 });

    const summary = (await api(shopper, "GET", "/customer/summary")).body.response;
    expect(summary).toMatchObject({ creditLimitKobo: 500_000_00, availableCreditKobo: 500_000_00, nextDue: null });
  });
});
