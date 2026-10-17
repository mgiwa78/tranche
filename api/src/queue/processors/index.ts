import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@/common/logger";
import { Config } from "@/config";
import { todayIso } from "@/common/helpers/dates";
import { ReminderService } from "@/core/billing/reminder.service";
import { DelinquencyService } from "@/core/billing/delinquency.service";
import { AutoChargeService } from "@/core/billing/auto-charge.service";
import { WebhookService } from "@/core/billing/webhook.service";
import { PayoutService } from "@/core/billing/payout.service";
import { QueueService } from "../queue.service";
import { JOBS, QUEUES } from "../queue.constants";

const logger = new Logger({ level: Config.logging.level, service: "queue" });

const unknownJob = (job: Job) => {
  logger.warn("Unknown job name", { queue: job.queueName, name: job.name });
  return null;
};

@Processor(QUEUES.REMINDERS)
export class RemindersProcessor extends WorkerHost {
  constructor(private readonly reminders: ReminderService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== JOBS.SEND_REMINDERS) return unknownJob(job);
    return this.reminders.sendDueReminders();
  }
}

@Processor(QUEUES.MAINTENANCE)
export class MaintenanceProcessor extends WorkerHost {
  constructor(private readonly delinquency: DelinquencyService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== JOBS.DELINQUENCY_SWEEP) return unknownJob(job);
    return this.delinquency.sweep();
  }
}

/** Two job types: the hourly scan fans out one `charge-installment` job per due installment. */
@Processor(QUEUES.CHARGES, { concurrency: 5 })
export class ChargesProcessor extends WorkerHost {
  constructor(
    private readonly autoCharge: AutoChargeService,
    private readonly queue: QueueService,
  ) {
    super();
  }

  async process(job: Job<{ installmentId?: string }>) {
    if (job.name === JOBS.SCAN_DUE) {
      const ids = await this.autoCharge.findDue();
      const day = todayIso();
      for (const id of ids) await this.queue.enqueueCharge(id, day);
      return { enqueued: ids.length };
    }
    if (job.name === JOBS.CHARGE_INSTALLMENT && job.data.installmentId) {
      return this.autoCharge.charge(job.data.installmentId);
    }
    return unknownJob(job);
  }
}

@Processor(QUEUES.WEBHOOKS, { concurrency: 10 })
export class WebhooksProcessor extends WorkerHost {
  constructor(private readonly webhooks: WebhookService) {
    super();
  }

  async process(job: Job<{ eventId: string }>) {
    if (job.name !== JOBS.PROCESS_WEBHOOK) return unknownJob(job);
    const event = await this.webhooks.process(job.data.eventId);
    return { status: event.status };
  }
}

@Processor(QUEUES.PAYOUTS)
export class PayoutsProcessor extends WorkerHost {
  constructor(private readonly payouts: PayoutService) {
    super();
  }

  async process(job: Job<{ payoutId: string }>) {
    if (job.name !== JOBS.EXECUTE_TRANSFER) return unknownJob(job);
    const payout = await this.payouts.executeTransfer(job.data.payoutId);
    return { status: payout.status };
  }
}

export const PROCESSORS = [
  RemindersProcessor,
  MaintenanceProcessor,
  ChargesProcessor,
  WebhooksProcessor,
  PayoutsProcessor,
];
