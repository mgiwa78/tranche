import { z } from "zod";
import { MerchantStatus, PayoutStatus } from "../enums/tranche.enums";
import { emailSchema, paginationQuerySchema, uuidSchema } from "./common.schema";

export const MIN_PAYOUT_KOBO = 1_000_00;

export const updateMerchantProfileSchema = z.object({
  name: z.string().trim().min(2, "Business name is required").max(120).optional(),
  supportEmail: emailSchema.nullable().optional(),
  settlementBankCode: z
    .string()
    .trim()
    .regex(/^\d{3,6}$/, "Select a bank")
    .nullable()
    .optional(),
  settlementAccountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Account number must be 10 digits")
    .nullable()
    .optional(),
  settlementAccountName: z.string().trim().max(120).nullable().optional(),
});

export const requestPayoutSchema = z.object({
  amountKobo: z.number().int().min(MIN_PAYOUT_KOBO, "Minimum payout is NGN 1,000"),
});

export const reviewPayoutSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.decision === "approve" || (v.reason !== undefined && v.reason.length >= 3), {
    path: ["reason"],
    message: "Give a reason for rejecting",
  });

export const updateMerchantStatusSchema = z.object({
  status: z.enum(MerchantStatus),
  reason: z.string().trim().max(500).optional(),
});

export const updateMerchantFeeSchema = z.object({
  feeBps: z.number().int().min(0).max(2000, "Fee can't exceed 20%"),
});

export const listPayoutsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PayoutStatus).optional(),
  merchantId: uuidSchema.optional(),
});

export const listMerchantsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(MerchantStatus).optional(),
});

export type UpdateMerchantProfileDTO = z.infer<typeof updateMerchantProfileSchema>;
export type RequestPayoutDTO = z.infer<typeof requestPayoutSchema>;
export type ReviewPayoutDTO = z.infer<typeof reviewPayoutSchema>;
export type UpdateMerchantStatusDTO = z.infer<typeof updateMerchantStatusSchema>;
export type UpdateMerchantFeeDTO = z.infer<typeof updateMerchantFeeSchema>;
export type ListPayoutsQueryDTO = z.infer<typeof listPayoutsQuerySchema>;
export type ListMerchantsQueryDTO = z.infer<typeof listMerchantsQuerySchema>;
