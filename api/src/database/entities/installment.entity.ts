import { Entity, Column, Index } from "typeorm";
import { InstallmentStatus, NotificationType } from "@tranche/shared";
import { BaseEntity } from "./base.entity";
import { koboColumn } from "../transformers";

@Entity("installments")
@Index("IDX_installments_order_sequence", ["orderId", "sequence"], { unique: true })
@Index("IDX_installments_customer_id", ["customerId"])
@Index("IDX_installments_merchant_id", ["merchantId"])
@Index("IDX_installments_status_due_date", ["status", "dueDate"])
export class Installment extends BaseEntity {
  @Column({ name: "order_id", type: "uuid" })
  orderId!: string;

  @Column({ name: "customer_id", type: "uuid" })
  customerId!: string;

  @Column({ name: "merchant_id", type: "uuid" })
  merchantId!: string;

  @Column({ type: "int" })
  sequence!: number;

  @Column(koboColumn("amount_kobo"))
  amountKobo!: number;

  @Column(koboColumn("late_fee_kobo", { default: 0 }))
  lateFeeKobo!: number;

  /** Calendar date (`YYYY-MM-DD`), no time component. */
  @Column({ name: "due_date", type: "date" })
  dueDate!: string;

  @Column({ type: "varchar", length: 16, default: InstallmentStatus.PENDING })
  status!: InstallmentStatus;

  @Column({ name: "paid_at", type: "timestamptz", nullable: true })
  paidAt?: Date | null;

  @Column({ name: "attempt_count", type: "int", default: 0 })
  attemptCount!: number;

  @Column({ name: "last_attempt_at", type: "timestamptz", nullable: true })
  lastAttemptAt?: Date | null;

  @Column({ name: "last_reminder_at", type: "timestamptz", nullable: true })
  lastReminderAt?: Date | null;

  @Column({ name: "last_reminder_type", type: "varchar", length: 32, nullable: true })
  lastReminderType?: NotificationType | null;
}
