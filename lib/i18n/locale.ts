import { cookies } from "next/headers";
import type { SupportedLanguage } from "@/types/db";

export const LOCALE_COOKIE_NAME = "templeos_locale";
const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const DEFAULT_LOCALE: SupportedLanguage = "en";

function isSupportedLanguage(value: string | undefined): value is SupportedLanguage {
  return value === "en" || value === "te";
}

export async function getLocaleCookie(): Promise<SupportedLanguage> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE_NAME)?.value;
  return isSupportedLanguage(value) ? value : DEFAULT_LOCALE;
}

export async function setLocaleCookie(locale: SupportedLanguage): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE_NAME, locale, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
  });
}
