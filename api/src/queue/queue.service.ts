import { Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Config } from "@/config";
import { Logger } from "@/common/logger";
import { JOBS, QUEUES } from "./queue.constants";

/**
 * Producer side of the queues. With QUEUE_INLINE=true (integration tests) jobs run in the
 * calling process instead, so tests are deterministic without waiting on workers.
 */
@Injectable()
export class QueueService {
  private logger = new Logger({ level: Config.logging.level, service: "queue" });

  constructor(
    private readonly moduleRef: ModuleRef,
    @InjectQueue(QUEUES.WEBHOOKS) private readonly webhooks: Queue,
    @InjectQueue(QUEUES.PAYOUTS) private readonly payouts: Queue,
    @InjectQueue(QUEUES.CHARGES) private readonly charges: Queue,
  ) {}

  private get inline() {
    return Config.queue.inline;
  }

  // Resolved lazily to keep the producer free of service imports (no DI cycle).
  private async run<T>(token: string, fn: (service: any) => Promise<T>): Promise<T> {
    const { WebhookService } = await import("@/core/billing/webhook.service");
    const { PayoutService } = await import("@/core/billing/payout.service");
    const { AutoChargeService } = await import("@/core/billing/auto-charge.service");
    const tokens: Record<string, unknown> = {
      webhook: WebhookService,
      payout: PayoutService,
      charge: AutoChargeService,
    };
    // Like a real worker: a failing job is logged (and would be retried), never thrown at the producer.
    return fn(this.moduleRef.get(tokens[token] as any, { strict: false })).catch((error) => {
      this.logger.warn("Inline job failed", { token, message: (error as Error).message });
      return undefined as T;
    });
  }

  async enqueueWebhook(eventId: string) {
    if (this.inline) return this.run("webhook", (s) => s.process(eventId));
    await this.webhooks.add(JOBS.PROCESS_WEBHOOK, { eventId }, { jobId: `webhook-${eventId}-${Date.now()}` });
  }

  async enqueuePayoutTransfer(payoutId: string) {
    if (this.inline) return this.run("payout", (s) => s.executeTransfer(payoutId));
    await this.payouts.add(JOBS.EXECUTE_TRANSFER, { payoutId }, { jobId: `payout-${payoutId}` });
  }

  async enqueueCharge(installmentId: string, day: string) {
    if (this.inline) return this.run("charge", (s) => s.charge(installmentId));
    await this.charges.add(JOBS.CHARGE_INSTALLMENT, { installmentId }, { jobId: `charge-${installmentId}-${day}` });
  }
}
