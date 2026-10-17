import { Entity, Column, Index, Check } from "typeorm";
import { LedgerDirection } from "@tranche/shared";
import { BaseEntity } from "./base.entity";
import { koboColumn } from "../transformers";

/**
 * One leg of a journal entry. Entries are append-only; a correction is a new reversing
 * transaction. The migration adds a deferred constraint trigger that rejects any
 * transaction whose debits and credits differ at COMMIT.
 */
@Entity("ledger_entries")
@Index("IDX_ledger_entries_transaction_id", ["transactionId"])
@Index("IDX_ledger_entries_account_id", ["accountId"])
@Check("CHK_ledger_entries_amount_positive", `"amount_kobo" > 0`)
export class LedgerEntry extends BaseEntity {
  @Column({ name: "transaction_id", type: "uuid" })
  transactionId!: string;

  @Column({ name: "account_id", type: "uuid" })
  accountId!: string;

  @Column({ type: "varchar", length: 8 })
  direction!: LedgerDirection;

  @Column(koboColumn("amount_kobo"))
  amountKobo!: number;
}
