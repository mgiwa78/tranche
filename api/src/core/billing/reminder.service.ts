import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { NotificationType, formatNaira } from "@tranche/shared";
import { Installment } from "@/database/entities";
import { Logger } from "@/common/logger";
import { Config } from "@/config";
import { isoDaysFromToday, todayIso } from "@/common/helpers/dates";
import { InstallmentRepository } from "@/repository/installment.repository";
import { NotificationDispatcher } from "../notification.dispatcher";
import { SettingsService } from "../settings.service";
import { loadNames } from "./presenters";

const HOUR = 60 * 60 * 1000;

/**
 * Decides whether an installment should get a reminder of `type` now. The same type is sent at
 * most once a day; overdue nudges repeat every 3 days.
 */
export const shouldRemind = (
  installment: Pick<Installment, "lastReminderAt" | "lastReminderType">,
  type: NotificationType,
  now: Date = new Date(),
): boolean => {
  if (!installment.lastReminderAt) return true;
  const since = now.getTime() - new Date(installment.lastReminderAt).getTime();
  if (type === NotificationType.INSTALLMENT_OVERDUE) return since >= 72 * HOUR - HOUR;
  if (installment.lastReminderType !== type) return true;
  return since >= 20 * HOUR;
};

export const reminderCopy = (
  type: NotificationType,
  amountKobo: number,
  merchantName: string | null,
  dueDate: string,
) => {
  const amount = formatNaira(amountKobo);
  const from = merchantName ? ` for your ${merchantName} order` : "";
  switch (type) {
    case NotificationType.INSTALLMENT_DUE_SOON:
      return {
        title: "Payment coming up",
        body: `${amount}${from} is due on ${dueDate}. We'll charge your saved card.`,
      };
    case NotificationType.INSTALLMENT_DUE_TODAY:
      return { title: "Payment due today", body: `${amount}${from} is due today.` };
    default:
      return { title: "Payment overdue", body: `${amount}${from} is overdue. Pay now to avoid further late fees.` };
  }
};

@Injectable()
export class ReminderService {
  private logger = new Logger({ level: Config.logging.level, service: "reminders" });

  constructor(
    private readonly dataSource: DataSource,
    private readonly installments: InstallmentRepository,
    private readonly dispatcher: NotificationDispatcher,
    private readonly settings: SettingsService,
  ) {}

  async sendDueReminders(now: Date = new Date()) {
    const { reminderDaysBefore } = await this.settings.get();
    const today = todayIso(now);
    const batches: [NotificationType, Installment[]][] = [
      [NotificationType.INSTALLMENT_DUE_TODAY, await this.installments.findUnpaidDueOn(today)],
      [NotificationType.INSTALLMENT_OVERDUE, await this.installments.findOverdue()],
    ];
    if (reminderDaysBefore > 0) {
      batches.unshift([
        NotificationType.INSTALLMENT_DUE_SOON,
        await this.installments.findUnpaidDueOn(isoDaysFromToday(reminderDaysBefore, now)),
      ]);
    }

    const all = batches.flatMap(([, rows]) => rows);
    const names = await loadNames(this.dataSource, { merchantIds: all.map((i) => i.merchantId) });
    const sent: Record<string, number> = {};

    for (const [type, rows] of batches) {
      sent[type] = 0;
      for (const installment of rows) {
        if (!shouldRemind(installment, type, now)) continue;
        const copy = reminderCopy(
          type,
          installment.amountKobo + installment.lateFeeKobo,
          names.merchantName(installment.merchantId),
          installment.dueDate,
        );
        await this.dispatcher.notify(installment.customerId, {
          type,
          ...copy,
          data: { orderId: installment.orderId, installmentId: installment.id },
        });
        await this.installments.update(installment.id, { lastReminderAt: now, lastReminderType: type });
        sent[type]++;
      }
    }

    this.logger.info("Reminders sent", sent);
    return sent;
  }
}
