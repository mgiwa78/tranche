import { Inject, Injectable } from "@nestjs/common";
import { DataSource, In } from "typeorm";
import {
  MerchantBalanceView,
  NotificationType,
  OrderStatus,
  PayoutStatus,
  PayoutView,
  ReviewPayoutDTO,
  formatNaira,
} from "@tranche/shared";
import { Merchant, Order, Payout } from "@/database/entities";
import { Logger } from "@/common/logger";
import { Config } from "@/config";
import { BadRequestError, ConflictError, InsufficientBalanceError, NotFoundError } from "@/common/errors";
import { createReference } from "@/common/crypto";
import { recordAdminAction } from "@/common/monitoring/audit";
import { IN_FLIGHT_PAYOUT_STATUSES, PayoutRepository } from "@/repository/payout.repository";
import { InstallmentRepository } from "@/repository/installment.repository";
import { LedgerService } from "../ledger/ledger.service";
import { payoutPaidPosting } from "../ledger/postings";
import { NotificationDispatcher } from "../notification.dispatcher";
import { PAYMENT_PROVIDER, PaymentProvider } from "../payments/payment-provider.interface";
import { QueueService } from "@/queue/queue.service";
import { toPayoutView } from "./presenters";

/**
 * Merchant settlements. Requests are capped by the ledger: available = merchant payable
 * balance minus payouts already in flight, checked under a per-merchant advisory lock so two
 * concurrent requests can't overdraw.
 */
@Injectable()
export class PayoutService {
  private logger = new Logger({ level: Config.logging.level, service: "payouts" });

  constructor(
    private readonly dataSource: DataSource,
    private readonly payouts: PayoutRepository,
    private readonly installments: InstallmentRepository,
    private readonly ledger: LedgerService,
    private readonly dispatcher: NotificationDispatcher,
    private readonly queue: QueueService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async balance(merchantId: string): Promise<MerchantBalanceView> {
    const [payable, pending, paidOut, outstanding, gmv] = await Promise.all([
      this.ledger.merchantPayableBalance(merchantId),
      this.payouts.sumByStatus(merchantId, IN_FLIGHT_PAYOUT_STATUSES),
      this.payouts.sumByStatus(merchantId, [PayoutStatus.PAID]),
      this.installments.outstandingForMerchant(merchantId),
      this.dataSource
        .getRepository(Order)
        .createQueryBuilder("o")
        .select("COALESCE(SUM(o.total_kobo), 0)", "total")
        .where("o.merchant_id = :merchantId", { merchantId })
        .andWhere({
          status: In([OrderStatus.ACTIVE, OrderStatus.OVERDUE, OrderStatus.COMPLETED, OrderStatus.DEFAULTED]),
        })
        .getRawOne<{ total: string }>(),
    ]);
    return {
      availableKobo: Math.max(0, payable - pending),
      pendingPayoutKobo: pending,
      outstandingKobo: outstanding.outstanding,
      lifetimeGmvKobo: Number(gmv?.total ?? 0),
      lifetimePaidOutKobo: paidOut,
    };
  }

  async request(merchantId: string, userId: string, amountKobo: number): Promise<PayoutView> {
    const merchant = await this.dataSource.getRepository(Merchant).findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundError("Merchant not found");
    if (!merchant.settlementAccountNumber || !merchant.settlementBankCode) {
      throw new BadRequestError("Add your settlement bank account before requesting a payout");
    }

    const payout = await this.dataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`payout:${merchantId}`]);
      const payable = await this.ledger.merchantPayableBalance(merchantId, manager);
      const row = await manager
        .createQueryBuilder(Payout, "p")
        .select("COALESCE(SUM(p.amount_kobo), 0)", "total")
        .where("p.merchant_id = :merchantId", { merchantId })
        .andWhere({ status: In(IN_FLIGHT_PAYOUT_STATUSES) })
        .getRawOne<{ total: string }>();
      const available = payable - Number(row?.total ?? 0);
      if (amountKobo > available) {
        throw new InsufficientBalanceError(`You can withdraw up to ${formatNaira(Math.max(0, available))}`, {
          availableKobo: Math.max(0, available),
        });
      }
      return manager.save(
        manager.create(Payout, {
          merchantId,
          amountKobo,
          status: PayoutStatus.REQUESTED,
          reference: createReference("TRO"),
          requestedByUserId: userId,
        }),
      );
    });
    return toPayoutView(payout, merchant.name);
  }

  async review(payoutId: string, adminUserId: string, dto: ReviewPayoutDTO): Promise<PayoutView> {
    const payout = await this.payouts.findById(payoutId);
    if (!payout) throw new NotFoundError("Payout not found");
    if (payout.status !== PayoutStatus.REQUESTED) throw new ConflictError(`Payout is already ${payout.status}`);

    payout.status = dto.decision === "approve" ? PayoutStatus.APPROVED : PayoutStatus.REJECTED;
    payout.reviewedByUserId = adminUserId;
    payout.reviewedAt = new Date();
    if (dto.decision === "reject") payout.failureReason = dto.reason ?? null;
    await this.payouts.save(payout);
    recordAdminAction(`payout.${dto.decision}`, adminUserId, "payout", payout.id, { reason: dto.reason });

    if (payout.status === PayoutStatus.APPROVED) await this.queue.enqueuePayoutTransfer(payout.id);
    return toPayoutView(payout);
  }

  /** Runs on the `payouts` queue after approval. */
  async executeTransfer(payoutId: string): Promise<Payout> {
    const payout = await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .createQueryBuilder(Payout, "p")
        .setLock("pessimistic_write")
        .where("p.id = :id", { id: payoutId })
        .getOne();
      if (!locked) throw new NotFoundError("Payout not found");
      if (locked.status !== PayoutStatus.APPROVED) return null;
      locked.status = PayoutStatus.PROCESSING;
      return manager.save(locked);
    });
    if (!payout) return (await this.payouts.findById(payoutId))!;

    const merchant = await this.dataSource.getRepository(Merchant).findOneOrFail({ where: { id: payout.merchantId } });
    try {
      if (!merchant.paystackRecipientCode) {
        merchant.paystackRecipientCode = await this.provider.createTransferRecipient({
          name: merchant.settlementAccountName || merchant.name,
          accountNumber: merchant.settlementAccountNumber ?? "",
          bankCode: merchant.settlementBankCode ?? "",
        });
        await this.dataSource.getRepository(Merchant).save(merchant);
      }
      const transfer = await this.provider.initiateTransfer({
        amountKobo: payout.amountKobo,
        recipientCode: merchant.paystackRecipientCode,
        reference: payout.reference,
        reason: `Tranche payout ${payout.reference}`,
      });
      await this.payouts.update(payout.id, { transferCode: transfer.transferCode });
      if (transfer.status === "success") return this.markPaid(payout.reference);
      if (transfer.status === "failed") return this.markFailed(payout.reference, "Transfer was declined");
      return payout;
    } catch (error) {
      this.logger.error("Payout transfer failed", error as Error, { payoutId });
      return this.markFailed(payout.reference, (error as Error).message);
    }
  }

  /** Idempotent: called by the transfer response or the `transfer.success` webhook. */
  async markPaid(reference: string): Promise<Payout> {
    const { payout, changed } = await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .createQueryBuilder(Payout, "p")
        .setLock("pessimistic_write")
        .where("p.reference = :reference", { reference })
        .getOne();
      if (!locked) throw new NotFoundError("Payout not found");
      if (locked.status === PayoutStatus.PAID) return { payout: locked, changed: false };
      locked.status = PayoutStatus.PAID;
      locked.processedAt = new Date();
      locked.failureReason = null;
      await manager.save(locked);
      const merchant = await manager.findOne(Merchant, { where: { id: locked.merchantId } });
      await this.ledger.post(
        manager,
        payoutPaidPosting({
          payoutId: locked.id,
          payoutReference: locked.reference,
          merchantId: locked.merchantId,
          merchantName: merchant?.name,
          amountKobo: locked.amountKobo,
        }),
      );
      return { payout: locked, changed: true };
    });

    if (changed) {
      const merchant = await this.dataSource.getRepository(Merchant).findOne({ where: { id: payout.merchantId } });
      if (merchant?.ownerUserId) {
        await this.dispatcher.notify(merchant.ownerUserId, {
          type: NotificationType.PAYOUT_PAID,
          title: "Payout sent",
          body: `${formatNaira(payout.amountKobo)} is on its way to your bank account.`,
          data: { payoutId: payout.id },
        });
      }
    }
    return payout;
  }

  async markFailed(reference: string, reason: string): Promise<Payout> {
    const payout = await this.payouts.findOne({ where: { reference } });
    if (!payout) throw new NotFoundError("Payout not found");
    if (payout.status === PayoutStatus.PAID) {
      this.logger.error("Transfer failure reported for a paid payout - needs manual review", undefined, { reference });
      return payout;
    }
    payout.status = PayoutStatus.FAILED;
    payout.failureReason = reason.slice(0, 500);
    payout.processedAt = new Date();
    return this.payouts.save(payout);
  }
}
