import { Injectable } from "@nestjs/common";
import { InstallmentStatus } from "@tranche/shared";
import { Logger } from "@/common/logger";
import { Config } from "@/config";
import { todayIso } from "@/common/helpers/dates";
import { AppError } from "@/common/errors";
import { InstallmentRepository } from "@/repository/installment.repository";
import { CollectionService } from "./collection.service";
import { SettingsService } from "../settings.service";

/** Finds installments due today (or earlier, still unpaid) and charges the saved card. */
@Injectable()
export class AutoChargeService {
  private logger = new Logger({ level: Config.logging.level, service: "auto-charge" });

  constructor(
    private readonly installments: InstallmentRepository,
    private readonly collection: CollectionService,
    private readonly settings: SettingsService,
  ) {}

  async findDue(now: Date = new Date()): Promise<string[]> {
    const { maxChargeAttempts } = await this.settings.get();
    const due = await this.installments.findChargeable(todayIso(now), maxChargeAttempts);
    return due.map((i) => i.id);
  }

  async charge(installmentId: string) {
    try {
      return await this.collection.collectInstallment(installmentId, { channel: "card", initiatedBy: "system" });
    } catch (error) {
      if (error instanceof AppError && error.status < 500) {
        // No saved card, already paid, order closed: nothing to retry. Count it as an attempt
        // so the installment drops out of the queue after maxChargeAttempts.
        await this.installments.update(installmentId, {
          attemptCount: () => "attempt_count + 1",
          lastAttemptAt: new Date(),
        });
        const current = await this.installments.findOne({ where: { id: installmentId } });
        if (current?.status === InstallmentStatus.PENDING) {
          await this.installments.update(installmentId, { status: InstallmentStatus.FAILED });
        }
        this.logger.info("Auto-charge skipped", { installmentId, reason: error.message });
        return null;
      }
      throw error;
    }
  }
}
