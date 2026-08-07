import { format, isToday, isYesterday } from "date-fns";
import { enIN, te, type Locale } from "date-fns/locale";
import type { SupportedLanguage } from "@/types/db";

const DATE_FNS_LOCALES: Record<SupportedLanguage, Locale> = { en: enIN, te };

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function formatDate(value: string | Date, locale: SupportedLanguage, pattern = "d MMM yyyy"): string {
  return format(toDate(value), pattern, { locale: DATE_FNS_LOCALES[locale] });
}

export function formatTime(value: string | Date, locale: SupportedLanguage): string {
  return format(toDate(value), "h:mm a", { locale: DATE_FNS_LOCALES[locale] });
}

export function formatDateTime(value: string | Date, locale: SupportedLanguage): string {
  return format(toDate(value), "d MMM yyyy, h:mm a", { locale: DATE_FNS_LOCALES[locale] });
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

/** Parses a "yyyy-MM-dd" (or "yyyy-MM-ddTHH:mm...") string into a local-midnight Date — `new Date(isoString)` parses date-only strings as UTC midnight, which shifts by a day in timezones ahead of UTC (e.g. India). */
export function parseISODate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * The "yyyy-MM-dd" calendar part of a date-only string ("2026-08-01") or a
 * timestamp ("2026-08-01T00:00:00.000Z"), without ever constructing a `Date`.
 *
 * Calendar dates (Postgres `DATE` columns — campaign start/end, date of
 * birth) describe a *day*, not an instant, so they must never be compared as
 * instants: `new Date("2026-08-01")` is midnight **UTC**, which is already
 * 05:30 on the 1st in India, so an instant comparison silently treats most of
 * that day as belonging to the previous one. Compare the strings this returns
 * against {@link todayInTimeZone} instead — ISO dates sort lexicographically,
 * so `<` / `>` on them is exact calendar-day comparison with no timezone maths.
 */
export function toCalendarDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = ISO_DATE_PATTERN.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/**
 * Today's calendar date in `timeZone` (an IANA name such as "Asia/Kolkata"),
 * as "yyyy-MM-dd". "en-CA" is the locale whose short date format *is* ISO.
 * Falls back to UTC for an unrecognized zone rather than throwing — a bad
 * tenant timezone must not take the public donation page down.
 */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  try {
    return now.toLocaleDateString("en-CA", { timeZone });
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Serializes a Date to "yyyy-MM-dd" using its local calendar fields — the counterpart to {@link parseISODate}; avoid `date.toISOString().slice(0, 10)`, which converts to UTC first and can shift the date by a day. */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export { isToday, isYesterday };
