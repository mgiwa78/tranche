/** Calendar dates travel as `YYYY-MM-DD` strings (no timezone drift between api, web and app). */
export type IsoDateOnly = string;

export const toIsoDate = (date: Date): IsoDateOnly => date.toISOString().slice(0, 10);

export const parseIsoDate = (value: IsoDateOnly | Date): Date => {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

/** Adds calendar months, clamping to month end (Jan 31 + 1 month = Feb 28/29). */
export const addMonths = (date: Date, months: number): Date => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target;
};

/** Whole days from `from` to `to` (negative when `to` is in the past). */
export const daysBetween = (from: IsoDateOnly | Date, to: IsoDateOnly | Date): number =>
  Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000);
