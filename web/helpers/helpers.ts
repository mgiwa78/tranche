import { formatNaira, fromKobo, toKobo } from "@tranche/shared";

export { formatNaira, fromKobo, toKobo };

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  // Calendar dates (YYYY-MM-DD) are rendered as-is in UTC so they never shift a day.
  const date = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00Z` : value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: value instanceof Date ? undefined : "UTC",
  }).format(date);
}

export function truncateId(id: string | null | undefined, length = 8): string {
  if (!id) return "—";
  return id.length <= length ? id : `${id.slice(0, length)}…`;
}

/** `₦1.2M`, `₦850k`: for stat cards where full precision is noise. */
export function formatNairaCompact(kobo: number | undefined | null): string {
  if (kobo === undefined || kobo === null) return "-";
  const naira = fromKobo(kobo);
  if (Math.abs(naira) >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(naira >= 10_000_000 ? 1 : 2)}M`;
  if (Math.abs(naira) >= 10_000) return `₦${Math.round(naira / 1_000)}k`;
  return formatNaira(kobo);
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(ratio < 0.1 ? 1 : 0)}%`;
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}
