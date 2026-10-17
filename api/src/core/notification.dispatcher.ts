import { Inject, Injectable } from "@nestjs/common";
import { NotificationType } from "@tranche/shared";
import { Logger } from "@/common/logger";
import { Config } from "@/config";
import { DeviceTokenRepository, NotificationRepository } from "@/repository/notification.repository";
import { PushProvider } from "./push/push-provider.interface";
import { PUSH_PROVIDER } from "./push/expo-push.provider";

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Writes the in-app notification, then pushes to every device the user registered.
 * Like the reference dispatcher it never throws: a failed push must not fail a payment.
 */
@Injectable()
export class NotificationDispatcher {
  private logger = new Logger({ level: Config.logging.level, service: "notification-dispatcher" });

  constructor(
    @Inject(PUSH_PROVIDER) private readonly pushProvider: PushProvider,
    private readonly notificationRepository: NotificationRepository,
    private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  async notify(userId: string, input: NotifyInput): Promise<void> {
    try {
      const notification = await this.notificationRepository.save(
        this.notificationRepository.create({
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          data: input.data ?? null,
        }),
      );

      const tokens = await this.deviceTokenRepository.listForUser(userId);
      if (tokens.length === 0) return;

      const result = await this.pushProvider.send(
        tokens.map((t) => t.token),
        {
          title: input.title,
          body: input.body,
          data: { ...(input.data ?? {}), type: input.type, notificationId: notification.id },
        },
      );

      if (result.invalidTokens.length > 0) {
        await this.deviceTokenRepository.pruneTokens(result.invalidTokens);
      }
    } catch (error) {
      this.logger.error("Failed to dispatch notification", error as Error, { userId, type: input.type });
    }
  }
}
