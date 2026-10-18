import { Injectable, PipeTransform } from "@nestjs/common";
import { ZodError, ZodType } from "zod";
import { ValidationError } from "../errors";

/** Schemas come from `@tranche/shared`, so the api rejects exactly what web/app forms reject. */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    try {
      return this.schema.parse(value ?? {});
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));
        throw new ValidationError("Validation failed", details);
      }
      throw error;
    }
  }
}

/** Shorthand: `@Body(zod(schema))`. */
export const zod = <T>(schema: ZodType<T>) => new ZodValidationPipe<T>(schema);
