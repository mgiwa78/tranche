import { z } from "zod";
import {
  AccountStatus,
  LedgerAccountType,
  LedgerOwnerType,
  LedgerTransactionKind,
  PlanCode,
  WebhookEventStatus,
} from "../enums/tranche.enums";
import { paginationQuerySchema, uuidSchema } from "./common.schema";

export const platformSettingsSchema = z.object({
  merchantFeeBps: z.number().int().min(0).max(2000),
  lateFeeKobo: z.number().int().min(0).max(1_000_000_00),
  graceDays: z.number().int().min(0).max(30),
  reminderDaysBefore: z.number().int().min(0).max(14),
  defaultCreditLimitKobo: z.number().int().min(0),
  maxChargeAttempts: z.number().int().min(1).max(10),
  enabledPlans: z.array(z.enum(PlanCode)).min(1, "Enable at least one plan"),
  maintenanceMode: z.boolean(),
});

export const updatePlatformSettingsSchema = platformSettingsSchema.partial();

export const listCustomersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(AccountStatus).optional(),
});

export const updateCustomerSchema = z.object({
  status: z.enum(AccountStatus).optional(),
  creditLimitKobo: z.number().int().min(0).optional(),
});

export const listLedgerAccountsQuerySchema = paginationQuerySchema.extend({
  type: z.enum(LedgerAccountType).optional(),
  ownerType: z.enum(LedgerOwnerType).optional(),
});

export const listLedgerTransactionsQuerySchema = paginationQuerySchema.extend({
  kind: z.enum(LedgerTransactionKind).optional(),
  accountId: uuidSchema.optional(),
});

export const listWebhookEventsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(WebhookEventStatus).optional(),
});

export type PlatformSettingsDTO = z.infer<typeof platformSettingsSchema>;
export type UpdatePlatformSettingsDTO = z.infer<typeof updatePlatformSettingsSchema>;
export type ListCustomersQueryDTO = z.infer<typeof listCustomersQuerySchema>;
export type UpdateCustomerDTO = z.infer<typeof updateCustomerSchema>;
export type ListLedgerAccountsQueryDTO = z.infer<typeof listLedgerAccountsQuerySchema>;
export type ListLedgerTransactionsQueryDTO = z.infer<typeof listLedgerTransactionsQuerySchema>;
export type ListWebhookEventsQueryDTO = z.infer<typeof listWebhookEventsQuerySchema>;
