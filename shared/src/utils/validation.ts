import type { ZodType } from "zod";
import type { FieldError } from "../types/api";

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

/**
 * Runs a shared schema on the client and returns the first message per field, so forms in
 * web and app show exactly the errors the api would return for the same input.
 */
export const validateWith = <T>(
  schema: ZodType<T>,
  input: unknown,
): { ok: true; data: T } | { ok: false; errors: FieldErrors<T> } => {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { ok: false, errors: errors as FieldErrors<T> };
};

/** Maps an api `VALIDATION_ERROR` details array onto the same per-field shape. */
export const fieldErrorsFromApi = (details: FieldError[] | undefined): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const d of details ?? []) if (!(d.path in errors)) errors[d.path] = d.message;
  return errors;
};
