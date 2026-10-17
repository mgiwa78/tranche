import { PaymentProviderName, PaymentStatus } from "@tranche/shared";

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");

export interface CardAuthorization {
  authorizationCode: string;
  signature: string;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  bank: string | null;
  reusable: boolean;
}

/** Normalised result of verifying or charging a transaction, whatever the provider. */
export interface ChargeResult {
  reference: string;
  status: PaymentStatus;
  amountKobo: number;
  paidAt: Date | null;
  providerTransactionId: string | null;
  gatewayResponse: string | null;
  authorization: CardAuthorization | null;
}

export interface InitializeParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}

export interface ChargeAuthorizationParams {
  email: string;
  amountKobo: number;
  reference: string;
  authorizationCode: string;
  metadata: Record<string, string>;
}

export type TransferStatus = "pending" | "success" | "failed";

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** Starts a hosted checkout; the shopper completes it in a browser. */
  initialize(params: InitializeParams): Promise<{ authorizationUrl: string; reference: string }>;
  verify(reference: string): Promise<ChargeResult>;
  /** Charges a saved card without the shopper (recurring installments). */
  chargeAuthorization(params: ChargeAuthorizationParams): Promise<ChargeResult>;
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean;
  createTransferRecipient(params: { name: string; accountNumber: string; bankCode: string }): Promise<string>;
  initiateTransfer(params: {
    amountKobo: number;
    recipientCode: string;
    reference: string;
    reason: string;
  }): Promise<{ transferCode: string; status: TransferStatus }>;
}
