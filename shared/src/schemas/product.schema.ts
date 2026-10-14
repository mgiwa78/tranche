import { z } from "zod";
import { ProductCategory } from "../enums/tranche.enums";
import { paginationQuerySchema, uuidSchema } from "./common.schema";

export const MIN_PRODUCT_PRICE_KOBO = 100_00;
export const MAX_PRODUCT_PRICE_KOBO = 50_000_000_00;

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120, "Name is too long"),
  description: z.string().trim().max(2000, "Description is too long").default(""),
  priceKobo: z
    .number()
    .int("Price must be whole kobo")
    .min(MIN_PRODUCT_PRICE_KOBO, "Minimum price is NGN 100")
    .max(MAX_PRODUCT_PRICE_KOBO, "Maximum price is NGN 50,000,000"),
  category: z.enum(ProductCategory),
  imageUrl: z.url("Enter a valid image URL").nullable().optional(),
  stock: z.number().int().min(0, "Stock can't be negative").default(0),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = paginationQuerySchema.extend({
  category: z.enum(ProductCategory).optional(),
  merchantId: uuidSchema.optional(),
  isActive: z.stringbool().optional(),
});

export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
export type ListProductsQueryDTO = z.infer<typeof listProductsQuerySchema>;
