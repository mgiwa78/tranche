import { createHmac } from "crypto";
import { PaymentStatus } from "@tranche/shared";
import { mapPaystackStatus, verifyPaystackSignature } from "./paystack.provider";
import { FakePaymentProvider, FAKE_DECLINED_AUTHORIZATION } from "./fake.provider";

describe("Paystack webhook signature", () => {
  const secret = "sk_test_123";
  const body = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "ref_1" } }));
  const sign = (b: Buffer, s = secret) => createHmac("sha512", s).update(b).digest("hex");

  it("accepts a body signed with the secret key", () => {
    expect(verifyPaystackSignature(secret, body, sign(body))).toBe(true);
  });

  it("rejects a tampered body, a wrong key, or a missing header", () => {
    const tampered = Buffer.from(body.toString().replace("ref_1", "ref_2"));
    expect(verifyPaystackSignature(secret, tampered, sign(body))).toBe(false);
    expect(verifyPaystackSignature(secret, body, sign(body, "sk_test_other"))).toBe(false);
    expect(verifyPaystackSignature(secret, body, undefined)).toBe(false);
    expect(verifyPaystackSignature("", body, sign(body, ""))).toBe(false);
  });

  it("rejects signatures of the wrong length without throwing", () => {
    expect(verifyPaystackSignature(secret, body, "abc")).toBe(false);
  });
});

describe("mapPaystackStatus", () => {
  it.each([
    ["success", PaymentStatus.SUCCESS],
    ["failed", PaymentStatus.FAILED],
    ["reversed", PaymentStatus.FAILED],
    ["abandoned", PaymentStatus.ABANDONED],
    ["ongoing", PaymentStatus.PENDING],
    ["send_otp", PaymentStatus.PENDING],
  ])("%s -> %s", (input, expected) => {
    expect(mapPaystackStatus(input)).toBe(expected);
  });
});

describe("FakePaymentProvider", () => {
  it("completes hosted checkouts and returns a reusable card", async () => {
    const fake = new FakePaymentProvider();
    await fake.initialize({ email: "a@b.co", amountKobo: 500, reference: "r1", callbackUrl: "x", metadata: {} });
    expect((await fake.verify("r1")).status).toBe(PaymentStatus.PENDING);
    fake.complete("r1");
    const result = await fake.verify("r1");
    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(result.authorization?.reusable).toBe(true);
  });

  it("declines the magic authorization code", async () => {
    const fake = new FakePaymentProvider();
    const result = await fake.chargeAuthorization({
      email: "a@b.co",
      amountKobo: 500,
      reference: "r2",
      authorizationCode: FAKE_DECLINED_AUTHORIZATION,
      metadata: {},
    });
    expect(result.status).toBe(PaymentStatus.FAILED);
  });

  it("signs webhooks it can verify", () => {
    const fake = new FakePaymentProvider();
    const body = Buffer.from("{}");
    expect(fake.verifyWebhookSignature(body, fake.sign(body))).toBe(true);
  });
});
