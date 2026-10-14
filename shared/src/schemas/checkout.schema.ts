import { z } from "zod";
import { InstallmentStatus, OrderStatus, PaymentStatus, PlanCode } from "../enums/tranche.enums";
import { paginationQuerySchema, uuidSchema } from "./common.schema";

export const checkoutItemSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(10, "Max 10 per item"),
});

export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "Your cart is empty").max(20, "Too many items"),
  planCode: z.enum(PlanCode),
  /** Charge a saved card for the first installment instead of opening the hosted checkout. */
  paymentMethodId: uuidSchema.optional(),
});

export const payInstallmentSchema = z.object({
  paymentMethodId: uuidSchema.optional(),
});

export const paymentReferenceParamSchema = z.object({
  reference: z.string().trim().min(6).max(100),
});

export const listOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(OrderStatus).optional(),
  merchantId: uuidSchema.optional(),
  customerId: uuidSchema.optional(),
});

export const listInstallmentsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(InstallmentStatus).optional(),
});

export const listPaymentsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PaymentStatus).optional(),
  orderId: uuidSchema.optional(),
});

export type CheckoutItemDTO = z.infer<typeof checkoutItemSchema>;
export type CheckoutDTO = z.infer<typeof checkoutSchema>;
export type PayInstallmentDTO = z.infer<typeof payInstallmentSchema>;
export type ListOrdersQueryDTO = z.infer<typeof listOrdersQuerySchema>;
export type ListInstallmentsQueryDTO = z.infer<typeof listInstallmentsQuerySchema>;
export type ListPaymentsQueryDTO = z.infer<typeof listPaymentsQuerySchema>;
