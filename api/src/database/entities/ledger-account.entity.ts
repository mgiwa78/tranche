import { Entity, Column, Index } from "typeorm";
import { LedgerAccountType, LedgerDirection, LedgerOwnerType } from "@tranche/shared";
import { BaseEntity } from "./base.entity";
import { koboColumn } from "../transformers";

/**
 * Chart of accounts. Platform accounts are fixed (`platform:clearing`, ...); merchant and
 * customer sub-accounts are opened on first use (`merchant_payable:<id>`, `customer_receivable:<id>`).
 */
@Entity("ledger_accounts")
@Index("IDX_ledger_accounts_code", ["code"], { unique: true })
@Index("IDX_ledger_accounts_owner", ["ownerType", "ownerId"])
export class LedgerAccount extends BaseEntity {
  @Column({ type: "varchar", length: 120 })
  code!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "varchar", length: 16 })
  type!: LedgerAccountType;

  @Column({ name: "owner_type", type: "varchar", length: 16 })
  ownerType!: LedgerOwnerType;

  @Column({ name: "owner_id", type: "uuid", nullable: true })
  ownerId?: string | null;

  @Column({ name: "normal_balance", type: "varchar", length: 8 })
  normalBalance!: LedgerDirection;

  /**
   * Running balance in the normal direction, maintained in the same transaction as each
   * posting (row-locked). `ledger_entries` stays the source of truth; the admin trial
   * balance recomputes from entries and flags any drift.
   */
  @Column(koboColumn("balance_kobo", { default: 0 }))
  balanceKobo!: number;
}
