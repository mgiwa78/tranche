import { Global, Module, OnModuleInit, Provider } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { Config, runsWorkers } from "@/config";
import { Logger } from "@/common/logger";
import { redisConnectionOptions } from "@/common/redis/client";
import { ALL_QUEUES } from "@/queue/queue.constants";
import { QueueService } from "@/queue/queue.service";
import { SchedulersService } from "@/queue/schedulers.service";
import { PROCESSORS } from "@/queue/processors";
import { LedgerService } from "./ledger/ledger.service";
import { PAYMENT_PROVIDER } from "./payments/payment-provider.interface";
import { PaystackProvider } from "./payments/paystack.provider";
import { FakePaymentProvider } from "./payments/fake.provider";
import { PUSH_PROVIDER, ExpoPushProvider } from "./push/expo-push.provider";
import { NotificationDispatcher } from "./notification.dispatcher";
import { EmailService } from "./email.service";
import { SettingsService } from "./settings.service";
import { CollectionService } from "./billing/collection.service";
import { ReminderService } from "./billing/reminder.service";
import { DelinquencyService } from "./billing/delinquency.service";
import { PayoutService } from "./billing/payout.service";
import { WebhookService } from "./billing/webhook.service";
import { AutoChargeService } from "./billing/auto-charge.service";
import { AnalyticsService } from "./analytics.service";

const logger = new Logger({ level: Config.logging.level, service: "core" });

/** Paystack when a secret key is configured; otherwise the in-memory fake (dev and tests). */
export const paymentProviderFactory = () => {
  if (Config.paystack.secretKey) return new PaystackProvider(Config.paystack.secretKey);
  if (Config.nodeEnv === "production") throw new Error("PAYSTACK_SECRET_KEY is required in production");
  logger.warn("PAYSTACK_SECRET_KEY not set - using the fake payment provider (dev checkout at /api/v1/dev/checkout)");
  return new FakePaymentProvider();
};

const SERVICES: Provider[] = [
  LedgerService,
  NotificationDispatcher,
  EmailService,
  SettingsService,
  CollectionService,
  ReminderService,
  DelinquencyService,
  PayoutService,
  WebhookService,
  AutoChargeService,
  AnalyticsService,
  QueueService,
  SchedulersService,
];

/**
 * Cross-audience domain services (the reference's `core/` folder) plus the BullMQ wiring.
 * Processors register only when this process runs workers (APP_ROLE = worker | all).
 */
@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: redisConnectionOptions(true),
      prefix: `${Config.redis.keyPrefix}:bull`,
      defaultJobOptions: {
        attempts: Config.queue.settings.attempts,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: Config.queue.settings.removeOnComplete,
        removeOnFail: Config.queue.settings.removeOnFail,
      },
    }),
    BullModule.registerQueue(...ALL_QUEUES.map((name) => ({ name }))),
  ],
  providers: [
    { provide: PAYMENT_PROVIDER, useFactory: paymentProviderFactory },
    { provide: PUSH_PROVIDER, useFactory: () => new ExpoPushProvider() },
    ...SERVICES,
    ...(runsWorkers() && !Config.queue.inline ? PROCESSORS : []),
  ],
  exports: [PAYMENT_PROVIDER, PUSH_PROVIDER, ...SERVICES],
})
export class CoreModule implements OnModuleInit {
  constructor(private readonly ledger: LedgerService) {}

  async onModuleInit() {
    await this.ledger.ensurePlatformAccounts().catch((error) => {
      logger.warn("Could not ensure platform ledger accounts yet (run migrations)", { message: error.message });
    });
  }
}
