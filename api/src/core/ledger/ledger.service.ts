import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import {
  LedgerAccountView,
  LedgerDirection,
  LedgerTransactionView,
  PaginatedResponse,
  TrialBalanceView,
} from "@tranche/shared";
import { LedgerAccount, LedgerEntry, LedgerTransaction } from "@/database/entities";
import { Logger } from "@/common/logger";
import { Config } from "@/config";
import { NotFoundError } from "@/common/errors";
import { buildMeta } from "@/common/helpers/list-filter";
import { AccountSpec, PLATFORM_ACCOUNTS, merchantPayableAccount } from "./chart-of-accounts";
import { Posting, assertBalanced, balanceDelta } from "./postings";

export interface PostResult {
  transaction: LedgerTransaction;
  created: boolean;
}

/**
 * Double-entry ledger. `post` must run inside the caller's transaction (pass its manager) so a
 * payment and its journal entry commit or roll back together. Postings are idempotent on
 * (kind, reference): replaying a webhook can never double-count money.
 */
@Injectable()
export class LedgerService {
  private logger = new Logger({ level: Config.logging.level, service: "ledger" });

  constructor(private readonly dataSource: DataSource) {}

  async ensurePlatformAccounts(manager: EntityManager = this.dataSource.manager): Promise<void> {
    for (const spec of Object.values(PLATFORM_ACCOUNTS)) await this.ensureAccount(manager, spec);
  }

  async ensureAccount(manager: EntityManager, spec: AccountSpec): Promise<LedgerAccount> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(LedgerAccount)
      .values({ ...spec, balanceKobo: 0 })
      .orIgnore()
      .execute();
    return manager.findOneOrFail(LedgerAccount, { where: { code: spec.code } });
  }

  async post(manager: EntityManager, posting: Posting): Promise<PostResult> {
    assertBalanced(posting.lines);

    const inserted = await manager
      .createQueryBuilder()
      .insert()
      .into(LedgerTransaction)
      .values({
        kind: posting.kind,
        reference: posting.reference,
        description: posting.description,
        metadata: (posting.metadata ?? null) as any,
      })
      .orIgnore()
      .returning(["id"])
      .execute();

    const insertedId = (inserted.raw as { id: string }[])[0]?.id;
    if (!insertedId) {
      const existing = await manager.findOneOrFail(LedgerTransaction, {
        where: { kind: posting.kind, reference: posting.reference },
      });
      this.logger.debug("Ledger posting already recorded", { kind: posting.kind, reference: posting.reference });
      return { transaction: existing, created: false };
    }

    const accounts = new Map<string, LedgerAccount>();
    for (const line of posting.lines) {
      if (!accounts.has(line.account.code))
        accounts.set(line.account.code, await this.ensureAccount(manager, line.account));
    }

    // Lock in a stable order so two concurrent postings touching the same accounts can't deadlock.
    const lockedIds = [...accounts.values()].map((a) => a.id).sort();
    await manager
      .createQueryBuilder(LedgerAccount, "a")
      .setLock("pessimistic_write")
      .where("a.id IN (:...ids)", { ids: lockedIds })
      .orderBy("a.id")
      .getMany();

    const deltas = new Map<string, number>();
    const entries = posting.lines.map((line) => {
      const account = accounts.get(line.account.code)!;
      deltas.set(account.id, (deltas.get(account.id) ?? 0) + balanceDelta(line.account, line));
      return manager.create(LedgerEntry, {
        transactionId: insertedId,
        accountId: account.id,
        direction: line.direction,
        amountKobo: line.amountKobo,
      });
    });
    await manager.save(LedgerEntry, entries);

    for (const [accountId, delta] of deltas) {
      if (delta === 0) continue;
      await manager
        .createQueryBuilder()
        .update(LedgerAccount)
        .set({ balanceKobo: () => `balance_kobo + (${Math.trunc(delta)})` })
        .where("id = :accountId", { accountId })
        .execute();
    }

    const transaction = await manager.findOneOrFail(LedgerTransaction, { where: { id: insertedId } });
    return { transaction, created: true };
  }

  async balanceOf(code: string, manager: EntityManager = this.dataSource.manager): Promise<number> {
    const account = await manager.findOne(LedgerAccount, { where: { code } });
    return account?.balanceKobo ?? 0;
  }

  merchantPayableBalance(merchantId: string, manager?: EntityManager) {
    return this.balanceOf(merchantPayableAccount(merchantId).code, manager);
  }

  async listAccounts(params: {
    page: number;
    limit: number;
    type?: string;
    ownerType?: string;
    search?: string;
  }): Promise<PaginatedResponse<LedgerAccountView>> {
    const qb = this.dataSource.getRepository(LedgerAccount).createQueryBuilder("a");
    if (params.type) qb.andWhere("a.type = :type", { type: params.type });
    if (params.ownerType) qb.andWhere("a.owner_type = :ownerType", { ownerType: params.ownerType });
    if (params.search) qb.andWhere("(a.name ILIKE :s OR a.code ILIKE :s)", { s: `%${params.search}%` });
    qb.orderBy("a.owner_type", "DESC")
      .addOrderBy("a.code", "ASC")
      .skip((params.page - 1) * params.limit)
      .take(params.limit);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toAccountView), meta: buildMeta(total, params.page, params.limit) };
  }

  async getAccount(id: string): Promise<LedgerAccountView> {
    const account = await this.dataSource.getRepository(LedgerAccount).findOne({ where: { id } });
    if (!account) throw new NotFoundError("Ledger account not found");
    return toAccountView(account);
  }

  async listTransactions(params: {
    page: number;
    limit: number;
    kind?: string;
    accountId?: string;
    search?: string;
  }): Promise<PaginatedResponse<LedgerTransactionView>> {
    const qb = this.dataSource.getRepository(LedgerTransaction).createQueryBuilder("t");
    if (params.kind) qb.andWhere("t.kind = :kind", { kind: params.kind });
    if (params.accountId) {
      qb.andWhere(
        "EXISTS (SELECT 1 FROM ledger_entries e WHERE e.transaction_id = t.id AND e.account_id = :accountId)",
        {
          accountId: params.accountId,
        },
      );
    }
    if (params.search) qb.andWhere("(t.reference ILIKE :s OR t.description ILIKE :s)", { s: `%${params.search}%` });
    qb.orderBy("t.created_at", "DESC")
      .skip((params.page - 1) * params.limit)
      .take(params.limit);
    const [transactions, total] = await qb.getManyAndCount();

    const ids = transactions.map((t) => t.id);
    const entries = ids.length
      ? await this.dataSource
          .getRepository(LedgerEntry)
          .createQueryBuilder("e")
          .innerJoin(LedgerAccount, "a", "a.id = e.account_id")
          .select([
            "e.id AS id",
            "e.transaction_id AS transaction_id",
            "e.account_id AS account_id",
            "e.direction AS direction",
            "e.amount_kobo AS amount_kobo",
            "a.code AS code",
            "a.name AS name",
          ])
          .where("e.transaction_id IN (:...ids)", { ids })
          .orderBy("e.direction", "DESC")
          .getRawMany<{
            id: string;
            transaction_id: string;
            account_id: string;
            direction: LedgerDirection;
            amount_kobo: string;
            code: string;
            name: string;
          }>()
      : [];

    return {
      data: transactions.map((t) => ({
        id: t.id,
        kind: t.kind,
        reference: t.reference,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
        entries: entries
          .filter((e) => e.transaction_id === t.id)
          .map((e) => ({
            id: e.id,
            accountId: e.account_id,
            accountCode: e.code,
            accountName: e.name,
            direction: e.direction,
            amountKobo: Number(e.amount_kobo),
          })),
      })),
      meta: buildMeta(total, params.page, params.limit),
    };
  }

  /**
   * Recomputed from entries (the source of truth), not from cached balances. `balanced` is
   * false if the books don't balance or any cached account balance has drifted.
   */
  async trialBalance(): Promise<TrialBalanceView & { driftedAccounts: string[] }> {
    const rows = await this.dataSource.query(`
      SELECT a.code, a.name, a.type, a.normal_balance, a.balance_kobo,
             COALESCE(SUM(CASE WHEN e.direction = 'debit' THEN e.amount_kobo END), 0)::bigint AS debit,
             COALESCE(SUM(CASE WHEN e.direction = 'credit' THEN e.amount_kobo END), 0)::bigint AS credit
        FROM ledger_accounts a
        LEFT JOIN ledger_entries e ON e.account_id = a.id
       GROUP BY a.id
       ORDER BY a.owner_type DESC, a.code ASC`);

    let totalDebitKobo = 0;
    let totalCreditKobo = 0;
    const driftedAccounts: string[] = [];
    const out = rows.map((r: any) => {
      const debitKobo = Number(r.debit);
      const creditKobo = Number(r.credit);
      totalDebitKobo += debitKobo;
      totalCreditKobo += creditKobo;
      const expected = r.normal_balance === LedgerDirection.DEBIT ? debitKobo - creditKobo : creditKobo - debitKobo;
      if (expected !== Number(r.balance_kobo)) driftedAccounts.push(r.code);
      return { code: r.code, name: r.name, type: r.type, debitKobo, creditKobo };
    });

    if (driftedAccounts.length) this.logger.error("Ledger balance drift detected", undefined, { driftedAccounts });

    return {
      rows: out,
      totalDebitKobo,
      totalCreditKobo,
      balanced: totalDebitKobo === totalCreditKobo && driftedAccounts.length === 0,
      driftedAccounts,
    };
  }
}

export const toAccountView = (a: LedgerAccount): LedgerAccountView => ({
  id: a.id,
  code: a.code,
  name: a.name,
  type: a.type,
  ownerType: a.ownerType,
  ownerId: a.ownerId ?? null,
  normalBalance: a.normalBalance,
  balanceKobo: a.balanceKobo,
});
