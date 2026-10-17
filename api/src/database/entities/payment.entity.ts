import { Entity, Column, Index } from "typeorm";
import { PaymentChannel, PaymentProviderName, PaymentStatus } from "@tranche/shared";
import { BaseEntity } from "./base.entity";
import { koboColumn } from "../transformers";

/** One collection attempt against one installment. The `reference` is what Paystack echoes back. */
@Entity("payments")
@Index("IDX_payments_reference", ["reference"], { unique: true })
@Index("IDX_payments_order_id", ["orderId"])
@Index("IDX_payments_installment_id", ["installmentId"])
@Index("IDX_payments_customer_id", ["customerId"])
@Index("IDX_payments_status", ["status"])
export class Payment extends BaseEntity {
  @Column({ type: "varchar", length: 64 })
  reference!: string;

  @Column({ name: "order_id", type: "uuid" })
  orderId!: string;

  @Column({ name: "installment_id", type: "uuid", nullable: true })
  installmentId?: string | null;

  @Column({ name: "customer_id", type: "uuid" })
  customerId!: string;

  @Column({ name: "merchant_id", type: "uuid" })
  merchantId!: string;

  @Column({ type: "varchar", length: 16 })
  provider!: PaymentProviderName;

  @Column({ type: "varchar", length: 16 })
  channel!: PaymentChannel;

  @Column(koboColumn("amount_kobo"))
  amountKobo!: number;

  @Column({ type: "varchar", length: 16, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ name: "payment_method_id", type: "uuid", nullable: true })
  paymentMethodId?: string | null;

  @Column({ name: "provider_transaction_id", type: "varchar", length: 64, nullable: true })
  providerTransactionId?: string | null;

  @Column({ name: "authorization_url", type: "text", nullable: true })
  authorizationUrl?: string | null;

  @Column({ name: "card_last4", type: "varchar", length: 4, nullable: true })
  cardLast4?: string | null;

  @Column({ name: "failure_reason", type: "varchar", length: 255, nullable: true })
  failureReason?: string | null;

  @Column({ name: "paid_at", type: "timestamptz", nullable: true })
  paidAt?: Date | null;
}
