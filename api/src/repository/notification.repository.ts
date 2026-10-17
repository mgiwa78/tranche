import { DataSource, In, IsNull } from "typeorm";
import { DeviceToken, Notification, WebhookEvent, PlatformSetting } from "@/database/entities";
import { RedisClient } from "@/common/redis/client";
import { BaseRepository } from "./base.repository";
import { RequestFilter, buildListFilter } from "@/common/helpers/list-filter";

export class NotificationRepository extends BaseRepository<Notification> {
  protected cacheEnabled = false;

  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(Notification, dataSource, redis);
  }

  protected getAlias(): string {
    return "notification";
  }

  list(userId: string, filter: RequestFilter, unreadOnly?: boolean) {
    return this.findPaginated({
      ...buildListFilter<Notification>(filter, { force: { userId } }),
      customize: unreadOnly ? (qb) => qb.andWhere("notification.read_at IS NULL") : undefined,
    });
  }

  unreadCount(userId: string) {
    return this.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(userId: string, ids?: string[]) {
    await this.createQueryBuilder()
      .update(Notification)
      .set({ readAt: () => "now()" })
      .where("user_id = :userId", { userId })
      .andWhere("read_at IS NULL")
      .andWhere(ids ? { id: In(ids) } : "1=1")
      .execute();
  }
}

export class DeviceTokenRepository extends BaseRepository<DeviceToken> {
  protected cacheEnabled = false;

  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(DeviceToken, dataSource, redis);
  }

  protected getAlias(): string {
    return "device_token";
  }

  listForUser(userId: string) {
    return this.find({ where: { userId } });
  }

  /** A token belongs to whoever registered it last (a shared phone changes hands). */
  async upsertForUser(userId: string, platform: DeviceToken["platform"], token: string) {
    await this.createQueryBuilder()
      .insert()
      .into(DeviceToken)
      .values({ userId, platform, token, lastSeenAt: new Date() })
      .orUpdate(["user_id", "platform", "last_seen_at", "updated_at"], ["token"])
      .execute();
  }

  async pruneTokens(tokens: string[]) {
    if (tokens.length === 0) return;
    await this.createQueryBuilder()
      .delete()
      .from(DeviceToken)
      .where({ token: In(tokens) })
      .execute();
  }
}

export class WebhookEventRepository extends BaseRepository<WebhookEvent> {
  protected cacheEnabled = false;

  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(WebhookEvent, dataSource, redis);
  }

  protected getAlias(): string {
    return "webhook_event";
  }

  protected getSearchFields(): string[] {
    return ["reference", "event"];
  }

  list(filter: RequestFilter) {
    return this.findPaginated(buildListFilter<WebhookEvent>(filter, { filters: ["status", "event"] }));
  }
}

export class PlatformSettingRepository extends BaseRepository<PlatformSetting> {
  protected cacheEnabled = false;

  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(PlatformSetting, dataSource, redis);
  }

  protected getAlias(): string {
    return "setting";
  }
}
