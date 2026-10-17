import { OrderStatus, PaymentStatus, PlanCode, WebhookEventStatus } from "@tranche/shared";
import { WebhookEvent } from "@/database/entities";
import {
  api,
  dataSource,
  fake,
  makeAdmin,
  makeCustomer,
  makeMerchant,
  makeProduct,
  rawPost,
  start,
  stop,
  trialBalance,
} from "./harness";

beforeAll(start);
afterAll(stop);

const signed = (body: object) => {
  const raw = JSON.stringify(body);
  return { raw, signature: fake.sign(raw) };
};

describe("Paystack webhooks", () => {
  it("rejects bad signatures", async () => {
    const { raw } = signed({ event: "charge.success", data: { reference: "x" } });
    const res = await rawPost("/webhooks/paystack", raw, { "x-paystack-signature": "deadbeef" });
    expect(res.status).toBe(401);
    expect(await dataSource.getRepository(WebhookEvent).count()).toBe(0);
  });

  it("settles a payment from charge.success, verifying with the provider rather than the payload", async () => {
    const { merchant } = await makeMerchant();
    const product = await makeProduct(merchant.id, { priceKobo: 80_000_00 });
    const shopper = await makeCustomer();
    const checkout = await api(shopper, "POST", "/customer/checkout", {
      items: [{ productId: product.id, quantity: 1 }],
      planCode: PlanCode.PAY_IN_4,
    });
    const { reference } = checkout.body.response.payment;

    // A forged "success" for an unpaid transaction does nothing: we re-verify with Paystack.
    const forged = signed({ event: "charge.success", data: { reference, amount: 1 } });
    await rawPost("/webhooks/paystack", forged.raw, { "x-paystack-signature": forged.signature });
    let order = (await api(shopper, "GET", `/customer/orders/${checkout.body.response.order.id}`)).body.response;
    expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);

    fake.complete(reference, true);
    const real = signed({ event: "charge.success", data: { reference, id: 99 } });
    const res = await rawPost("/webhooks/paystack", real.raw, { "x-paystack-signature": real.signature });
    expect(res.status).toBe(200);
    expect(res.body.response).toEqual({ received: true, duplicate: false });

    order = (await api(shopper, "GET", `/customer/orders/${checkout.body.response.order.id}`)).body.response;
    expect(order.status).toBe(OrderStatus.ACTIVE);
    expect(order.payments[0].status).toBe(PaymentStatus.SUCCESS);

    // Paystack retries: acknowledged, not processed again.
    const before = await trialBalance();
    const retry = await rawPost("/webhooks/paystack", real.raw, { "x-paystack-signature": real.signature });
    expect(retry.body.response).toEqual({ received: true, duplicate: true });
    expect((await trialBalance()).totalDebitKobo).toBe(before.totalDebitKobo);

    // One stored event: the early (unconfirmed) delivery failed and was retried until processed.
    const events = await dataSource.getRepository(WebhookEvent).find({ where: { reference } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ status: WebhookEventStatus.PROCESSED, attempts: 2 });
  });

  it("ignores events for unknown references and unknown event types", async () => {
    const unknown = signed({ event: "charge.success", data: { reference: "not-ours" } });
    await rawPost("/webhooks/paystack", unknown.raw, { "x-paystack-signature": unknown.signature });
    const other = signed({ event: "subscription.create", data: { id: 1 } });
    await rawPost("/webhooks/paystack", other.raw, { "x-paystack-signature": other.signature });

    const admin = await makeAdmin();
    const list = (await api(admin, "GET", `/admin/webhooks?status=${WebhookEventStatus.IGNORED}`)).body.response;
    expect(list.data.map((e: any) => e.event).sort()).toEqual(["charge.success", "subscription.create"]);
  });

  it("rejects non-JSON bodies even when signed", async () => {
    const res = await rawPost("/webhooks/paystack", "not json", { "x-paystack-signature": fake.sign("not json") });
    expect(res.status).toBe(400);
  });
});
