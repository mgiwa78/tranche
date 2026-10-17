import { AdminRole, MerchantStatus, PayoutStatus, ProductCategory } from "@tranche/shared";
import { LedgerService } from "@/core/ledger/ledger.service";
import { merchantPayableAccount } from "@/core/ledger/chart-of-accounts";
import {
  api,
  checkoutAndPay,
  dataSource,
  fake,
  get,
  makeAdmin,
  makeCustomer,
  makeMerchant,
  makeProduct,
  start,
  stop,
  trialBalance,
} from "./harness";

beforeAll(start);
afterAll(stop);

describe("merchant dashboard api", () => {
  it("manages products with shared validation and per-merchant scope", async () => {
    const owner = await makeMerchant();
    const rival = await makeMerchant();

    const invalid = await api(owner, "POST", "/merchant/products", { name: "x", priceKobo: 5, category: "toys" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details.map((d: any) => d.path)).toEqual(
      expect.arrayContaining(["name", "priceKobo", "category"]),
    );

    const created = await api(owner, "POST", "/merchant/products", {
      name: "Smart Watch",
      priceKobo: 85_000_00,
      category: ProductCategory.ELECTRONICS,
      stock: 5,
    });
    expect(created.status).toBe(201);
    const id = created.body.response.id;

    const updated = await api(owner, "PATCH", `/merchant/products/${id}`, { priceKobo: 80_000_00, isActive: false });
    expect(updated.body.response).toMatchObject({ priceKobo: 80_000_00, isActive: false });

    expect((await api(rival, "PATCH", `/merchant/products/${id}`, { name: "Mine now" })).status).toBe(404);
    expect((await api(rival, "DELETE", `/merchant/products/${id}`)).status).toBe(404);

    const list = (await api(owner, "GET", "/merchant/products?isActive=false")).body.response;
    expect(list.data.map((p: any) => p.id)).toEqual([id]);

    expect((await api(owner, "DELETE", `/merchant/products/${id}`)).status).toBe(200);
    expect((await api(owner, "GET", `/merchant/products/${id}`)).status).toBe(404);
  });

  it("is closed to shoppers and to suspended merchants' writes", async () => {
    const shopper = await makeCustomer();
    expect((await api(shopper, "GET", "/merchant/orders")).status).toBe(403);

    const owner = await makeMerchant({ status: MerchantStatus.SUSPENDED });
    expect((await api(owner, "GET", "/merchant/orders")).status).toBe(200);
    const write = await api(owner, "POST", "/merchant/products", {
      name: "Blocked",
      priceKobo: 10_000_00,
      category: ProductCategory.OTHER,
    });
    expect(write.status).toBe(403);
  });

  it("shows orders, outstanding balances and dashboard numbers from the ledger", async () => {
    const owner = await makeMerchant({ feeBps: 500 });
    const product = await makeProduct(owner.merchant.id, { priceKobo: 100_000_00 });
    const shopper = await makeCustomer({ firstName: "Kemi", lastName: "Bello" });
    const { checkout } = await checkoutAndPay(shopper, product.id);

    const orders = (await api(owner, "GET", "/merchant/orders")).body.response;
    expect(orders.data[0]).toMatchObject({
      id: checkout.order.id,
      customerName: "Kemi Bello",
      outstandingKobo: 75_000_00,
    });

    const detail = (await api(owner, "GET", `/merchant/orders/${checkout.order.id}`)).body.response;
    expect(detail.installments).toHaveLength(4);

    const outstanding = (await api(owner, "GET", "/merchant/outstanding")).body.response;
    expect(outstanding.data[0]).toMatchObject({
      reference: checkout.order.reference,
      outstandingKobo: 75_000_00,
      overdueKobo: 0,
    });

    const dashboard = (await api(owner, "GET", "/merchant/dashboard?days=7")).body.response;
    expect(dashboard.balance).toMatchObject({
      availableKobo: 95_000_00,
      outstandingKobo: 75_000_00,
      lifetimeGmvKobo: 100_000_00,
    });
    expect(dashboard.series).toHaveLength(7);
    expect(dashboard.series.at(-1)).toMatchObject({ gmvKobo: 100_000_00, collectedKobo: 25_000_00, orders: 1 });
    expect(dashboard.activeOrders).toBe(1);
  });

  it("caps payouts at the ledger balance, then approval transfers and posts the payout", async () => {
    const owner = await makeMerchant({ feeBps: 1000 });
    const product = await makeProduct(owner.merchant.id, { priceKobo: 50_000_00 });
    await checkoutAndPay(await makeCustomer(), product.id);

    const tooMuch = await api(owner, "POST", "/merchant/payouts", { amountKobo: 45_000_01 });
    expect(tooMuch.status).toBe(422);
    expect(tooMuch.body.error.code).toBe("INSUFFICIENT_BALANCE");

    const requested = await api(owner, "POST", "/merchant/payouts", { amountKobo: 30_000_00 });
    expect(requested.status).toBe(201);
    expect(requested.body.response.status).toBe(PayoutStatus.REQUESTED);

    // In flight payouts count against what's available.
    expect((await api(owner, "GET", "/merchant/balance")).body.response).toMatchObject({
      availableKobo: 15_000_00,
      pendingPayoutKobo: 30_000_00,
    });
    expect((await api(owner, "POST", "/merchant/payouts", { amountKobo: 20_000_00 })).status).toBe(422);

    const support = await makeAdmin(AdminRole.SUPPORT);
    const review = (who: any) =>
      api(who, "POST", `/admin/payouts/${requested.body.response.id}/review`, { decision: "approve" });
    expect((await review(support)).status).toBe(403);
    const approved = await review(await makeAdmin(AdminRole.ADMIN));
    expect(approved.status).toBe(200);

    const payouts = (await api(owner, "GET", "/merchant/payouts")).body.response;
    expect(payouts.data[0]).toMatchObject({ status: PayoutStatus.PAID, amountKobo: 30_000_00 });
    expect(fake.transfers.at(-1)).toMatchObject({ amountKobo: 30_000_00, recipientCode: "RCP_fake_0123456789" });

    const ledger = get<LedgerService>(LedgerService);
    expect(await ledger.balanceOf(merchantPayableAccount(owner.merchant.id).code)).toBe(15_000_00);
    expect((await trialBalance()).balanced).toBe(true);
  });

  it("needs settlement details before a payout", async () => {
    const owner = await makeMerchant({ settlementAccountNumber: null, settlementBankCode: null });
    const res = await api(owner, "POST", "/merchant/payouts", { amountKobo: 1_000_00 });
    expect(res.status).toBe(400);

    const profile = await api(owner, "PATCH", "/merchant/profile", {
      settlementBankCode: "044",
      settlementAccountNumber: "9876543210",
      settlementAccountName: "NEW NAME",
    });
    expect(profile.body.response.settlementAccountNumber).toBe("******3210");
    const raw = await dataSource.query("SELECT paystack_recipient_code FROM merchants WHERE id = $1", [
      owner.merchant.id,
    ]);
    expect(raw[0].paystack_recipient_code).toBeNull();
  });
});
