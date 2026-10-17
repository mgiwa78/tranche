import { Inject, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { WebhookEventStatus } from "@tranche/shared";
import { WebhookEvent } from "@/database/entities";
import { Logger } from "@/common/logger";
import { Config } from "@/config";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/common/errors";
import { WebhookEventRepository } from "@/repository/notification.repository";
import { QueueService } from "@/queue/queue.service";
import { PAYMENT_PROVIDER, PaymentProvider } from "../payments/payment-provider.interface";
import { CollectionService } from "./collection.service";
import { PayoutService } from "./payout.service";

interface ProviderEvent {
  event: string;
  data: { reference?: string; id?: number | string; transfer_code?: string; reason?: string; [k: string]: unknown };
}

export const webhookDedupeKey = (provider: string, body: ProviderEvent) =>
  `${provider}:${body.event}:${body.data?.reference ?? body.data?.transfer_code ?? body.data?.id ?? "none"}`;

/**
 * Store, acknowledge, process later. The HTTP handler only verifies the signature and inserts
 * the event (dedupe key unique), so Paystack gets a fast 200; a BullMQ job does the work and
 * retries with backoff if it throws.
 */
@Injectable()
export class WebhookService {
  private logger = new Logger({ level: Config.logging.level, service: "webhooks" });

  constructor(
    private readonly dataSource: DataSource,
    private readonly events: WebhookEventRepository,
    private readonly collection: CollectionService,
    private readonly payouts: PayoutService,
    private readonly queue: QueueService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async receive(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!rawBody) throw new BadRequestError("Missing body");
    if (!this.provider.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn("Rejected webhook with invalid signature");
      throw new UnauthorizedError("Invalid signature");
    }

    let body: ProviderEvent;
    try {
      body = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestError("Body is not JSON");
    }
    if (!body?.event) throw new BadRequestError("Missing event");

    const inserted = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(WebhookEvent)
      .values({
        provider: this.provider.name,
        event: body.event,
        reference: (body.data?.reference as string | undefined) ?? null,
        dedupeKey: webhookDedupeKey(this.provider.name, body),
        payload: body as any,
        status: WebhookEventStatus.RECEIVED,
      })
      .orIgnore()
      .returning(["id"])
      .execute();

    let id = (inserted.raw as { id: string }[])[0]?.id;
    if (!id) {
      // Seen before. Only a delivery that never got processed successfully is worth another go.
      const existing = await this.events.findOne({ where: { dedupeKey: webhookDedupeKey(this.provider.name, body) } });
      if (
        !existing ||
        existing.status === WebhookEventStatus.PROCESSED ||
        existing.status === WebhookEventStatus.IGNORED
      ) {
        return { received: true, duplicate: true };
      }
      id = existing.id;
    }

    await this.queue.enqueueWebhook(id);
    return { received: true, duplicate: false };
  }

  async process(eventId: string): Promise<WebhookEvent> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundError("Webhook event not found");
    if (event.status === WebhookEventStatus.PROCESSED || event.status === WebhookEventStatus.IGNORED) return event;

    const body = event.payload as unknown as ProviderEvent;
    let status = WebhookEventStatus.PROCESSED;
    try {
      switch (body.event) {
        case "charge.success": {
          const reference = body.data.reference;
          const exists = reference
            ? await this.dataSource.query("SELECT 1 FROM payments WHERE reference = $1", [reference])
            : [];
          if (!exists.length) {
            status = WebhookEventStatus.IGNORED;
            break;
          }
          const settled = await this.collection.settle(reference!);
          // Paystack can notify before its verify endpoint agrees; fail so the job retries.
          if (settled.outcome === "pending") throw new Error("Provider has not confirmed this charge yet");
          break;
        }
        case "transfer.success":
          await this.payouts.markPaid(String(body.data.reference));
          break;
        case "transfer.failed":
        case "transfer.reversed":
          await this.payouts.markFailed(String(body.data.reference), String(body.data.reason ?? body.event));
          break;
        default:
          status = WebhookEventStatus.IGNORED;
      }
      await this.events.update(event.id, {
        status,
        attempts: event.attempts + 1,
        error: null,
        processedAt: new Date(),
      });
    } catch (error) {
      await this.events.update(event.id, {
        status: WebhookEventStatus.FAILED,
        attempts: event.attempts + 1,
        error: (error as Error).message?.slice(0, 2000) ?? "Unknown error",
      });
      throw error;
    }
    return (await this.events.findOne({ where: { id: event.id } }))!;
  }

  async replay(eventId: string) {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundError("Webhook event not found");
    await this.events.update(event.id, { status: WebhookEventStatus.RECEIVED });
    await this.queue.enqueueWebhook(event.id);
    return { queued: true };
  }
}
