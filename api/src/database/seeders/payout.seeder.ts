import { DataSource } from "typeorm";
import { faker } from "@faker-js/faker";
import { LedgerTransactionKind, PayoutStatus } from "@tranche/shared";
import { LedgerTransaction, Payout } from "@/database/entities";
import { createReference } from "@/common/crypto";
import { LedgerService } from "@/core/ledger/ledger.service";
import { payoutPaidPosting } from "@/core/ledger/postings";
import { seededMerchants } from "./merchant.seeder";
import { seededStaff } from "./user.seeder";

/**
 * Per merchant: one paid payout (60% of what Tranche owes them, posted to the ledger), one
 * waiting for review, and the occasional rejected request. Never more than the ledger balance.
 */
export class PayoutSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Payout);
    const ledger = new LedgerService(dataSource);
    const reviewer = (await seededStaff(dataSource)).find((s) => s.adminRole !== "support");

    for (const merchant of await seededMerchants(dataSource)) {
      const payable = await ledger.merchantPayableBalance(merchant.id);
      if (payable < 2_000_00) continue;

      const paidAmount = Math.floor(payable * 0.6);
      const requestedAt = faker.date.recent({ days: 20 });
      const processedAt = new Date(requestedAt.getTime() + faker.number.int({ min: 2, max: 30 }) * 3_600_000);
      await dataSource.transaction(async (manager) => {
        const paid = await manager.save(
          manager.create(Payout, {
            merchantId: merchant.id,
            amountKobo: paidAmount,
            status: PayoutStatus.PAID,
            reference: createReference("TRO"),
            transferCode: `TRF_${faker.string.alphanumeric(12).toLowerCase()}`,
            requestedByUserId: merchant.ownerUserId ?? null,
            reviewedByUserId: reviewer?.id ?? null,
            reviewedAt: processedAt,
            processedAt,
            createdAt: requestedAt,
          }),
        );
        await ledger.post(
          manager,
          payoutPaidPosting({
            payoutId: paid.id,
            payoutReference: paid.reference,
            merchantId: merchant.id,
            merchantName: merchant.name,
            amountKobo: paidAmount,
          }),
        );
        await manager.update(
          LedgerTransaction,
          { kind: LedgerTransactionKind.PAYOUT, reference: paid.id },
          { createdAt: processedAt },
        );
      });

      const remaining = payable - paidAmount;
      if (remaining >= 2_000_00) {
        await repo.save(
          repo.create({
            merchantId: merchant.id,
            amountKobo: Math.floor(remaining * 0.5),
            status: PayoutStatus.REQUESTED,
            reference: createReference("TRO"),
            requestedByUserId: merchant.ownerUserId ?? null,
            createdAt: faker.date.recent({ days: 2 }),
          }),
        );
      }
      if (faker.number.float() < 0.3) {
        await repo.save(
          repo.create({
            merchantId: merchant.id,
            amountKobo: faker.number.int({ min: 5_000, max: 50_000 }) * 100,
            status: PayoutStatus.REJECTED,
            reference: createReference("TRO"),
            failureReason: "Settlement account name doesn't match the business name",
            requestedByUserId: merchant.ownerUserId ?? null,
            reviewedByUserId: reviewer?.id ?? null,
            reviewedAt: faker.date.recent({ days: 25 }),
            createdAt: faker.date.recent({ days: 30 }),
          }),
        );
      }
    }
  }
}
