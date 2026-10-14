import { z } from "zod";
import { emailSchema } from "./common.schema";

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?\d{10,14}$/, "Enter a valid phone number");

const nameSchema = (label: string) =>
  z.string().trim().min(1, `${label} is required`).max(60, `${label} is too long`);

export const registerCustomerSchema = z.object({
  firstName: nameSchema("First name"),
  lastName: nameSchema("Last name"),
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
});

export const registerMerchantSchema = registerCustomerSchema.extend({
  businessName: z.string().trim().min(2, "Business name is required").max(120),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    message: "Choose a different password",
  });

export const updateProfileSchema = z.object({
  firstName: nameSchema("First name").optional(),
  lastName: nameSchema("Last name").optional(),
  phone: phoneSchema.nullable().optional(),
});

export type RegisterCustomerDTO = z.infer<typeof registerCustomerSchema>;
export type RegisterMerchantDTO = z.infer<typeof registerMerchantSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type RefreshTokenDTO = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;
