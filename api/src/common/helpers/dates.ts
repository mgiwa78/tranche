import { addDays, parseIsoDate, toIsoDate } from "@tranche/shared";
import { Config } from "@/config";

/** Today's calendar date in the business timezone (Africa/Lagos), as `YYYY-MM-DD`. */
export const todayIso = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: Config.schedules.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export const isoDaysFromToday = (days: number, now: Date = new Date()): string =>
  toIsoDate(addDays(parseIsoDate(todayIso(now)), days));

export const toIso = (d: Date | null | undefined): string | null => (d ? new Date(d).toISOString() : null);
