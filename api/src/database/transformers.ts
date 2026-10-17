import { ValueTransformer } from "typeorm";

/**
 * Postgres `bigint` comes back from `pg` as a string. Kobo amounts stay far below
 * Number.MAX_SAFE_INTEGER (9e15 kobo = 90 trillion naira), so they map to number.
 */
export const koboTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) => (value === null || value === undefined ? value : Number(value)),
};

export const koboColumn = (name: string, options: { nullable?: boolean; default?: number } = {}) => ({
  name,
  type: "bigint" as const,
  transformer: koboTransformer,
  nullable: options.nullable ?? false,
  ...(options.default !== undefined ? { default: options.default } : {}),
});
