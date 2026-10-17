import { Entity, Column, Index } from "typeorm";
import { PaymentProviderName, WebhookEventStatus } from "@tranche/shared";
import { BaseEntity } from "./base.entity";

/**
 * Every provider webhook is stored before it is processed. `dedupe_key` is unique, so a
 * provider retrying the same event is acknowledged without being processed twice.
 */
@Entity("webhook_events")
@Index("IDX_webhook_events_dedupe_key", ["dedupeKey"], { unique: true })
@Index("IDX_webhook_events_status", ["status"])
export class WebhookEvent extends BaseEntity {
  @Column({ type: "varchar", length: 16 })
  provider!: PaymentProviderName;

  @Column({ type: "varchar", length: 64 })
  event!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  reference?: string | null;

  @Column({ name: "dedupe_key", type: "varchar", length: 200 })
  dedupeKey!: string;

  @Column({ type: "varchar", length: 16, default: WebhookEventStatus.RECEIVED })
  status!: WebhookEventStatus;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @Column({ type: "text", nullable: true })
  error?: string | null;

  @Column({ type: "jsonb" })
  payload!: Record<string, unknown>;

  @Column({ name: "processed_at", type: "timestamptz", nullable: true })
  processedAt?: Date | null;
}
