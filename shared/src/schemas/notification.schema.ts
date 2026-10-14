import { z } from "zod";
import { DevicePlatform } from "../enums/tranche.enums";
import { paginationQuerySchema } from "./common.schema";

export const registerDeviceTokenSchema = z.object({
  platform: z.enum(DevicePlatform),
  token: z.string().trim().min(10).max(512),
});

export const deviceTokenParamSchema = z.object({
  token: z.string().trim().min(10).max(512),
});

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  unread: z.stringbool().optional(),
});

export type RegisterDeviceTokenDTO = z.infer<typeof registerDeviceTokenSchema>;
export type ListNotificationsQueryDTO = z.infer<typeof listNotificationsQuerySchema>;
