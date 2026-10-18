import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { Config } from "@/config";
import { Logger } from "@/common/logger";
import { PushPayload, PushProvider, PushSendResult } from "./push-provider.interface";

export const PUSH_PROVIDER = Symbol("PUSH_PROVIDER");

/**
 * Expo fans out to FCM/APNs, so the app only needs an Expo push token. Tokens Expo reports as
 * `DeviceNotRegistered` are returned as invalid so the dispatcher can prune them.
 */
export class ExpoPushProvider implements PushProvider {
  private expo = new Expo({ accessToken: Config.expo.accessToken || undefined });
  private logger = new Logger({ level: Config.logging.level, service: "expo-push" });

  async send(tokens: string[], payload: PushPayload): Promise<PushSendResult> {
    const invalidTokens: string[] = tokens.filter((t) => !Expo.isExpoPushToken(t));
    const valid: string[] = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (valid.length === 0) return { invalidTokens };

    const messages: ExpoPushMessage[] = valid.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: payload.sound === false ? null : "default",
      channelId: "payments",
      priority: "high",
    }));

    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      try {
        const tickets: ExpoPushTicket[] = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, index) => {
          if (ticket.status === "error") {
            if (ticket.details?.error === "DeviceNotRegistered") invalidTokens.push(String(chunk[index].to));
            else this.logger.warn("Expo push ticket error", { message: ticket.message, error: ticket.details?.error });
          }
        });
      } catch (error) {
        this.logger.error("Expo push send failed", error as Error);
      }
    }
    return { invalidTokens };
  }
}

/** Used in tests: records what would have been sent. */
export class RecordingPushProvider implements PushProvider {
  readonly sent: { tokens: string[]; payload: PushPayload }[] = [];

  async send(tokens: string[], payload: PushPayload): Promise<PushSendResult> {
    this.sent.push({ tokens, payload });
    return { invalidTokens: tokens.filter((t) => t.startsWith("invalid")) };
  }
}
