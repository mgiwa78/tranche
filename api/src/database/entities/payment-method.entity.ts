import { Entity, Column, Index } from "typeorm";
import { PaymentProviderName } from "@tranche/shared";
import { SoftDeleteBaseEntity } from "./soft-delete-base.entity";

/**
 * A reusable card authorization from Paystack. `authorizationCode` is encrypted at rest
 * (AES-256-GCM, see common/crypto) because it can be charged without the shopper present.
 */
@Entity("payment_methods")
@Index("IDX_payment_methods_customer_signature", ["customerId", "signature"], { unique: true })
export class PaymentMethod extends SoftDeleteBaseEntity {
  @Column({ name: "customer_id", type: "uuid" })
  customerId!: string;

  @Column({ type: "varchar", length: 16 })
  provider!: PaymentProviderName;

  @Column({ name: "authorization_code", type: "text" })
  authorizationCode!: string;

  /** Paystack's stable card fingerprint; the same card saved twice is one row. */
  @Column({ type: "varchar", length: 64 })
  signature!: string;

  @Column({ type: "varchar", length: 24 })
  brand!: string;

  @Column({ type: "varchar", length: 4 })
  last4!: string;

  @Column({ name: "exp_month", type: "varchar", length: 2 })
  expMonth!: string;

  @Column({ name: "exp_year", type: "varchar", length: 4 })
  expYear!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  bank?: string | null;

  @Column({ type: "boolean", default: true })
  reusable!: boolean;

  @Column({ name: "is_default", type: "boolean", default: false })
  isDefault!: boolean;
}
