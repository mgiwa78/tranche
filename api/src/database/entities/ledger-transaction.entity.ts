import { Entity, Column, Index } from "typeorm";
import { LedgerTransactionKind } from "@tranche/shared";
import { BaseEntity } from "./base.entity";

/** A journal entry. (kind, reference) is unique, which makes every posting idempotent. */
@Entity("ledger_transactions")
@Index("IDX_ledger_transactions_kind_reference", ["kind", "reference"], { unique: true })
@Index("IDX_ledger_transactions_created_at", ["createdAt"])
export class LedgerTransaction extends BaseEntity {
  @Column({ type: "varchar", length: 32 })
  kind!: LedgerTransactionKind;

  @Column({ type: "varchar", length: 120 })
  reference!: string;

  @Column({ type: "varchar", length: 255 })
  description!: string;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown> | null;
}
