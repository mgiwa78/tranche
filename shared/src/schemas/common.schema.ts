import { z } from "zod";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const emptySchema = z.object({});

export const uuidSchema = z.uuid("Invalid id");

export const idParamSchema = z.object({ id: uuidSchema });

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

/** Integer kobo. Use for every money field on the wire. */
export const koboSchema = z.number().int("Amount must be whole kobo").nonnegative("Amount can't be negative");

export const isoDateSchema = z.iso.date("Use YYYY-MM-DD");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  sort: z
    .string()
    .regex(/^[A-Za-z]+:(asc|desc|ASC|DESC)$/, "Use field:asc or field:desc")
    .optional(),
  search: z.string().trim().max(200).optional(),
});

export const dateRangeQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
});

export type PaginationQueryDTO = z.infer<typeof paginationQuerySchema>;
export type IdParamDTO = z.infer<typeof idParamSchema>;
export type AnalyticsQueryDTO = z.infer<typeof analyticsQuerySchema>;
