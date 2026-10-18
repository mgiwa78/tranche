import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import {
  ListNotificationsQueryDTO,
  RegisterDeviceTokenDTO,
  idParamSchema,
  listNotificationsQuerySchema,
  registerDeviceTokenSchema,
  deviceTokenParamSchema,
} from "@tranche/shared";
import { CurrentUser } from "@/common/decorators";
import { zod } from "@/common/pipes/zod-validation.pipe";
import { getFilterOptions } from "@/common/types";
import { mapPaginated } from "@/common/helpers/list-filter";
import type { User } from "@/database/entities";
import { DeviceTokenRepository, NotificationRepository } from "@/repository/notification.repository";
import { toNotificationView } from "@/core/billing/presenters";

@Controller("notifications")
export class NotificationController {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly deviceTokens: DeviceTokenRepository,
  ) {}

  @Get()
  async list(@CurrentUser() user: User, @Query(zod(listNotificationsQuerySchema)) query: ListNotificationsQueryDTO) {
    const { unread, ...rest } = query;
    const page = await this.notifications.list(user.id, getFilterOptions(rest), unread);
    return { ...mapPaginated(page, toNotificationView), unreadCount: await this.notifications.unreadCount(user.id) };
  }

  @Post("read-all")
  @HttpCode(200)
  async readAll(@CurrentUser() user: User) {
    await this.notifications.markRead(user.id);
    return { unreadCount: 0 };
  }

  @Post(":id/read")
  @HttpCode(200)
  async read(@CurrentUser() user: User, @Param(zod(idParamSchema)) params: { id: string }) {
    await this.notifications.markRead(user.id, [params.id]);
    return { unreadCount: await this.notifications.unreadCount(user.id) };
  }

  @Post("device-tokens")
  @HttpCode(200)
  async registerDevice(@CurrentUser() user: User, @Body(zod(registerDeviceTokenSchema)) dto: RegisterDeviceTokenDTO) {
    await this.deviceTokens.upsertForUser(user.id, dto.platform, dto.token);
    return { registered: true };
  }

  @Delete("device-tokens/:token")
  async unregisterDevice(@CurrentUser() user: User, @Param(zod(deviceTokenParamSchema)) params: { token: string }) {
    await this.deviceTokens.delete(0, { token: params.token, userId: user.id }).catch(() => undefined);
    return { unregistered: true };
  }
}
