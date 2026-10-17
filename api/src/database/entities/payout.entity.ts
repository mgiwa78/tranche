import { Entity, Column, Index } from "typeorm";
import { PayoutStatus } from "@tranche/shared";
import { BaseEntity } from "./base.entity";
import { koboColumn } from "../transformers";

@Entity("payouts")
@Index("IDX_payouts_reference", ["reference"], { unique: true })
@Index("IDX_payouts_merchant_id", ["merchantId"])
@Index("IDX_payouts_status", ["status"])
export class Payout extends BaseEntity {
  @Column({ name: "merchant_id", type: "uuid" })
  merchantId!: string;

  @Column(koboColumn("amount_kobo"))
  amountKobo!: number;

  @Column({ type: "varchar", length: 16, default: PayoutStatus.REQUESTED })
  status!: PayoutStatus;

  @Column({ type: "varchar", length: 64 })
  reference!: string;

  @Column({ name: "transfer_code", type: "varchar", length: 64, nullable: true })
  transferCode?: string | null;

  @Column({ name: "failure_reason", type: "varchar", length: 500, nullable: true })
  failureReason?: string | null;

  @Column({ name: "requested_by_user_id", type: "uuid", nullable: true })
  requestedByUserId?: string | null;

  @Column({ name: "reviewed_by_user_id", type: "uuid", nullable: true })
  reviewedByUserId?: string | null;

  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: "processed_at", type: "timestamptz", nullable: true })
  processedAt?: Date | null;
}
