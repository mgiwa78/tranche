import { Entity, Column, Index } from "typeorm";
import { MerchantStatus } from "@tranche/shared";
import { SoftDeleteBaseEntity } from "./soft-delete-base.entity";

@Entity("merchants")
@Index("IDX_merchants_slug", ["slug"], { unique: true })
@Index("IDX_merchants_status", ["status"])
export class Merchant extends SoftDeleteBaseEntity {
  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 140 })
  slug!: string;

  @Column({ type: "varchar", length: 16, default: MerchantStatus.PENDING })
  status!: MerchantStatus;

  @Column({ name: "owner_user_id", type: "uuid", nullable: true })
  ownerUserId?: string | null;

  /** Null = platform default (`platform_settings.merchantFeeBps`). */
  @Column({ name: "fee_bps", type: "int", nullable: true })
  feeBps?: number | null;

  @Column({ name: "support_email", type: "varchar", length: 255, nullable: true })
  supportEmail?: string | null;

  @Column({ name: "settlement_bank_code", type: "varchar", length: 10, nullable: true })
  settlementBankCode?: string | null;

  @Column({ name: "settlement_account_number", type: "varchar", length: 20, nullable: true })
  settlementAccountNumber?: string | null;

  @Column({ name: "settlement_account_name", type: "varchar", length: 120, nullable: true })
  settlementAccountName?: string | null;

  /** Paystack transfer recipient, created lazily on first payout. */
  @Column({ name: "paystack_recipient_code", type: "varchar", length: 64, nullable: true })
  paystackRecipientCode?: string | null;
}
