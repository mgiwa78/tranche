import { createHmac } from "crypto";
import { PaymentProviderName, PaymentStatus } from "@tranche/shared";
import { Config } from "@/config";
import { verifyPaystackSignature } from "./paystack.provider";
import {
  CardAuthorization,
  ChargeAuthorizationParams,
  ChargeResult,
  InitializeParams,
  PaymentProvider,
} from "./payment-provider.interface";

/** Card authorization codes the fake provider declines (use in tests / local demos). */
export const FAKE_DECLINED_AUTHORIZATION = "AUTH_declined";
export const FAKE_WEBHOOK_SECRET = "fake_webhook_secret";

interface FakeTransaction {
  reference: string;
  amountKobo: number;
  email: string;
  status: PaymentStatus;
  authorization: CardAuthorization | null;
  callbackUrl?: string;
}

const fakeAuthorization = (email: string): CardAuthorization => ({
  authorizationCode: `AUTH_${createHmac("sha256", "fake").update(email).digest("hex").slice(0, 10)}`,
  signature: `SIG_${createHmac("sha256", "fake-sig").update(email).digest("hex").slice(0, 16)}`,
  brand: "visa",
  last4: "4081",
  expMonth: "12",
  expYear: "2030",
  bank: "Test Bank",
  reusable: true,
});

/**
 * In-memory stand-in for Paystack, used by the test suite and by local development when no
 * PAYSTACK_SECRET_KEY is set. Hosted checkouts point at the api's own dev checkout page
 * (`GET /api/v1/dev/checkout/:reference`) which lets you approve or decline the payment.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = PaymentProviderName.FAKE;
  readonly transactions = new Map<string, FakeTransaction>();
  readonly transfers: { reference: string; amountKobo: number; recipientCode: string }[] = [];

  async initialize(params: InitializeParams) {
    this.transactions.set(params.reference, {
      reference: params.reference,
      amountKobo: params.amountKobo,
      email: params.email,
      status: PaymentStatus.PENDING,
      authorization: null,
      callbackUrl: params.callbackUrl,
    });
    return {
      authorizationUrl: `${Config.appUrl}/api/v1/dev/checkout/${encodeURIComponent(params.reference)}`,
      reference: params.reference,
    };
  }

  /** What the shopper does on the hosted page. */
  complete(reference: string, approve = true): FakeTransaction | undefined {
    const tx = this.transactions.get(reference);
    if (!tx) return undefined;
    tx.status = approve ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    tx.authorization = approve ? fakeAuthorization(tx.email) : null;
    return tx;
  }

  async verify(reference: string): Promise<ChargeResult> {
    const tx = this.transactions.get(reference);
    if (!tx) {
      return {
        reference,
        status: PaymentStatus.FAILED,
        amountKobo: 0,
        paidAt: null,
        providerTransactionId: null,
        gatewayResponse: "Transaction not found",
        authorization: null,
      };
    }
    return this.toResult(tx);
  }

  async chargeAuthorization(params: ChargeAuthorizationParams): Promise<ChargeResult> {
    const declined = params.authorizationCode === FAKE_DECLINED_AUTHORIZATION;
    const tx: FakeTransaction = {
      reference: params.reference,
      amountKobo: params.amountKobo,
      email: params.email,
      status: declined ? PaymentStatus.FAILED : PaymentStatus.SUCCESS,
      authorization: declined ? null : fakeAuthorization(params.email),
    };
    this.transactions.set(params.reference, tx);
    return { ...this.toResult(tx), gatewayResponse: declined ? "Insufficient funds" : "Approved" };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
    return verifyPaystackSignature(FAKE_WEBHOOK_SECRET, rawBody, signature);
  }

  /** Signs a body the way Paystack would, for tests. */
  sign(rawBody: string | Buffer) {
    return createHmac("sha512", FAKE_WEBHOOK_SECRET).update(rawBody).digest("hex");
  }

  async createTransferRecipient(params: { accountNumber: string }) {
    return `RCP_fake_${params.accountNumber}`;
  }

  async initiateTransfer(params: { amountKobo: number; recipientCode: string; reference: string }) {
    this.transfers.push(params);
    return { transferCode: `TRF_fake_${params.reference}`, status: "success" as const };
  }

  private toResult(tx: FakeTransaction): ChargeResult {
    return {
      reference: tx.reference,
      status: tx.status,
      amountKobo: tx.amountKobo,
      paidAt: tx.status === PaymentStatus.SUCCESS ? new Date() : null,
      providerTransactionId: tx.status === PaymentStatus.SUCCESS ? `fake_${tx.reference}` : null,
      gatewayResponse: tx.status === PaymentStatus.SUCCESS ? "Approved" : null,
      authorization: tx.authorization,
    };
  }
}
