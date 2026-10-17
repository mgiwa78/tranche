import { Injectable } from "@nestjs/common";
import { DataSource, In, LessThan } from "typeorm";
import { InstallmentStatus, OrderStatus, PaymentStatus, daysBetween } from "@tranche/shared";
import { Installment, Order, Payment } from "@/database/entities";
import { Logger } from "@/common/logger";
import { Config } from "@/config";
import { todayIso } from "@/common/helpers/dates";
import { InstallmentRepository } from "@/repository/installment.repository";
import { LedgerService } from "../ledger/ledger.service";
import { lateFeePosting } from "../ledger/postings";
import { SettingsService } from "../settings.service";

export const DEFAULT_AFTER_DAYS = 60;
export const STALE_CHECKOUT_HOURS = 24;

/**
 * Nightly sweep: unpaid past-due installments become OVERDUE (and so do their orders), a late
 * fee is charged once per installment after the grace period, orders 60+ days overdue are
 * marked DEFAULTED, and checkouts never paid within 24h are cancelled.
 */
@Injectable()
export class DelinquencyService {
  private logger = new Logger({ level: Config.logging.level, service: "delinquency" });

  constructor(
    private readonly dataSource: DataSource,
    private readonly installments: InstallmentRepository,
    private readonly ledger: LedgerService,
    private readonly settings: SettingsService,
  ) {}

  async sweep(now: Date = new Date()) {
    const today = todayIso(now);
    const { graceDays, lateFeeKobo } = await this.settings.get();
    const result = { markedOverdue: 0, lateFees: 0, defaulted: 0, cancelledCheckouts: 0 };

    for (const installment of await this.installments.findPastDue(today)) {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Installment, installment.id, { status: InstallmentStatus.OVERDUE });
        await manager.update(
          Order,
          { id: installment.orderId, status: OrderStatus.ACTIVE },
          { status: OrderStatus.OVERDUE },
        );
      });
      result.markedOverdue++;
    }

    for (const installment of await this.installments.findOverdue()) {
      const daysLate = daysBetween(installment.dueDate, today);

      if (lateFeeKobo > 0 && installment.lateFeeKobo === 0 && daysLate > graceDays) {
        await this.dataSource.transaction(async (manager) => {
          const locked = await manager
            .createQueryBuilder(Installment, "i")
            .setLock("pessimistic_write")
            .where("i.id = :id", { id: installment.id })
            .getOneOrFail();
          if (locked.lateFeeKobo > 0 || locked.status !== InstallmentStatus.OVERDUE) return;
          locked.lateFeeKobo = lateFeeKobo;
          await manager.save(locked);
          await this.ledger.post(
            manager,
            lateFeePosting({
              installmentId: locked.id,
              orderId: locked.orderId,
              customerId: locked.customerId,
              amountKobo: lateFeeKobo,
            }),
          );
          result.lateFees++;
        });
      }

      if (daysLate >= DEFAULT_AFTER_DAYS) {
        const updated = await this.dataSource
          .getRepository(Order)
          .update({ id: installment.orderId, status: OrderStatus.OVERDUE }, { status: OrderStatus.DEFAULTED });
        result.defaulted += updated.affected ?? 0;
      }
    }

    result.cancelledCheckouts = await this.cancelStaleCheckouts(now);
    this.logger.info("Delinquency sweep finished", result);
    return result;
  }

  private async cancelStaleCheckouts(now: Date) {
    const cutoff = new Date(now.getTime() - STALE_CHECKOUT_HOURS * 60 * 60 * 1000);
    const stale = await this.dataSource
      .getRepository(Order)
      .find({ where: { status: OrderStatus.PENDING_PAYMENT, createdAt: LessThan(cutoff) }, select: ["id"] });
    if (stale.length === 0) return 0;
    const ids = stale.map((o) => o.id);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        Order,
        { id: In(ids), status: OrderStatus.PENDING_PAYMENT },
        { status: OrderStatus.CANCELLED, cancelledAt: now },
      );
      await manager.update(Installment, { orderId: In(ids) }, { status: InstallmentStatus.CANCELLED });
      await manager.update(
        Payment,
        { orderId: In(ids), status: PaymentStatus.PENDING },
        { status: PaymentStatus.ABANDONED, failureReason: "Checkout expired" },
      );
    });
    return ids.length;
  }
}
