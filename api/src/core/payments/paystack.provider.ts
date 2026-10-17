import axios, { AxiosError, AxiosInstance } from "axios";
import { createHmac, timingSafeEqual } from "crypto";
import { PaymentProviderName, PaymentStatus } from "@tranche/shared";
import { Config } from "@/config";
import { Logger } from "@/common/logger";
import { PaymentFailedError, ServiceUnavailableError } from "@/common/errors";
import {
  CardAuthorization,
  ChargeAuthorizationParams,
  ChargeResult,
  InitializeParams,
  PaymentProvider,
  TransferStatus,
} from "./payment-provider.interface";

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackTransaction {
  id: number;
  status: string;
  reference: string;
  amount: number;
  paid_at: string | null;
  gateway_response: string | null;
  authorization?: {
    authorization_code: string;
    signature: string;
    card_type: string;
    brand?: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    bank: string | null;
    reusable: boolean;
  };
}

/** Paystack statuses -> ours. `ongoing`, `pending`, `queued`, `send_otp` etc. stay pending. */
export const mapPaystackStatus = (status: string): PaymentStatus => {
  switch (status) {
    case "success":
      return PaymentStatus.SUCCESS;
    case "failed":
    case "reversed":
      return PaymentStatus.FAILED;
    case "abandoned":
      return PaymentStatus.ABANDONED;
    default:
      return PaymentStatus.PENDING;
  }
};

/** Paystack signs the raw request body with HMAC-SHA512 of the secret key. */
export const verifyPaystackSignature = (secretKey: string, rawBody: Buffer, signature: string | undefined) => {
  if (!secretKey || !signature) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
};

const toAuthorization = (a: PaystackTransaction["authorization"]): CardAuthorization | null =>
  a?.authorization_code
    ? {
        authorizationCode: a.authorization_code,
        signature: a.signature,
        brand: (a.brand || a.card_type || "card").trim().toLowerCase(),
        last4: a.last4,
        expMonth: a.exp_month,
        expYear: a.exp_year,
        bank: a.bank ?? null,
        reusable: !!a.reusable,
      }
    : null;

const toChargeResult = (t: PaystackTransaction): ChargeResult => ({
  reference: t.reference,
  status: mapPaystackStatus(t.status),
  amountKobo: t.amount,
  paidAt: t.paid_at ? new Date(t.paid_at) : null,
  providerTransactionId: t.id ? String(t.id) : null,
  gatewayResponse: t.gateway_response ?? null,
  authorization: toAuthorization(t.authorization),
});

export class PaystackProvider implements PaymentProvider {
  readonly name = PaymentProviderName.PAYSTACK;
  private http: AxiosInstance;
  private logger = new Logger({ level: Config.logging.level, service: "paystack" });

  constructor(private readonly secretKey: string = Config.paystack.secretKey) {
    this.http = axios.create({
      baseURL: Config.paystack.baseUrl,
      timeout: 20_000,
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    });
  }

  private async call<T>(fn: () => Promise<{ data: PaystackEnvelope<T> }>, action: string): Promise<T> {
    try {
      const res = await fn();
      if (!res.data.status) throw new PaymentFailedError(res.data.message || `Paystack ${action} failed`);
      return res.data.data;
    } catch (error) {
      if (error instanceof PaymentFailedError) throw error;
      const err = error as AxiosError<PaystackEnvelope<unknown>>;
      const status = err.response?.status;
      const message = err.response?.data?.message;
      this.logger.warn(`Paystack ${action} error`, { status, message });
      if (status && status >= 400 && status < 500) throw new PaymentFailedError(message || `Paystack ${action} failed`);
      throw new ServiceUnavailableError("Payment provider is unavailable, please try again");
    }
  }

  async initialize(params: InitializeParams) {
    const data = await this.call<{ authorization_url: string; reference: string }>(
      () =>
        this.http.post("/transaction/initialize", {
          email: params.email,
          amount: params.amountKobo,
          reference: params.reference,
          callback_url: params.callbackUrl,
          currency: "NGN",
          channels: ["card"],
          metadata: params.metadata,
        }),
      "initialize",
    );
    return { authorizationUrl: data.authorization_url, reference: data.reference };
  }

  async verify(reference: string) {
    const data = await this.call<PaystackTransaction>(
      () => this.http.get(`/transaction/verify/${encodeURIComponent(reference)}`),
      "verify",
    );
    return toChargeResult(data);
  }

  async chargeAuthorization(params: ChargeAuthorizationParams) {
    try {
      const data = await this.call<PaystackTransaction>(
        () =>
          this.http.post("/transaction/charge_authorization", {
            email: params.email,
            amount: params.amountKobo,
            authorization_code: params.authorizationCode,
            reference: params.reference,
            currency: "NGN",
            metadata: params.metadata,
          }),
        "charge_authorization",
      );
      return toChargeResult(data);
    } catch (error) {
      // A declined card is a normal outcome for recurring charges, not an exception.
      if (error instanceof PaymentFailedError) {
        return {
          reference: params.reference,
          status: PaymentStatus.FAILED,
          amountKobo: params.amountKobo,
          paidAt: null,
          providerTransactionId: null,
          gatewayResponse: error.message,
          authorization: null,
        };
      }
      throw error;
    }
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
    return verifyPaystackSignature(this.secretKey, rawBody, signature);
  }

  async createTransferRecipient(params: { name: string; accountNumber: string; bankCode: string }) {
    const data = await this.call<{ recipient_code: string }>(
      () =>
        this.http.post("/transferrecipient", {
          type: "nuban",
          name: params.name,
          account_number: params.accountNumber,
          bank_code: params.bankCode,
          currency: "NGN",
        }),
      "transferrecipient",
    );
    return data.recipient_code;
  }

  async initiateTransfer(params: { amountKobo: number; recipientCode: string; reference: string; reason: string }) {
    const data = await this.call<{ transfer_code: string; status: string }>(
      () =>
        this.http.post("/transfer", {
          source: "balance",
          amount: params.amountKobo,
          recipient: params.recipientCode,
          reference: params.reference,
          reason: params.reason,
          currency: "NGN",
        }),
      "transfer",
    );
    const status: TransferStatus =
      data.status === "success" ? "success" : data.status === "failed" ? "failed" : "pending";
    return { transferCode: data.transfer_code, status };
  }
}
