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

export { isToday, isYesterday };
