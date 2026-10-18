import { daysBetween, parseIsoDate, toIsoDate } from '@tranche/shared';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today in the shopper's local calendar, as `YYYY-MM-DD`. */
export function localToday(): string {
  const d = new Date();
  return toIsoDate(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
}

/** `14 Nov` for calendar dates and timestamps alike. Adds the year when it isn't this year. */
export function shortDate(value: string): string {
  const date = value.length === 10 ? parseIsoDate(value) : new Date(value);
  const sameYear = date.getUTCFullYear() === new Date().getFullYear();
  const day = value.length === 10 ? date.getUTCDate() : date.getDate();
  const month = value.length === 10 ? date.getUTCMonth() : date.getMonth();
  return `${day} ${MONTHS[month]}${sameYear ? '' : ` ${date.getUTCFullYear()}`}`;
}

/** "Due today", "Due tomorrow", "Due in 5 days", "Due 14 Nov". */
export function dueLabel(dueDate: string): string {
  const days = daysBetween(localToday(), dueDate);
  if (days < 0) return `Overdue since ${shortDate(dueDate)}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${shortDate(dueDate)}`;
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d ago`;
  return shortDate(iso);
}

export const cardLabel = (brand: string, last4: string) =>
  `${brand.charAt(0).toUpperCase()}${brand.slice(1)} •••• ${last4}`;
