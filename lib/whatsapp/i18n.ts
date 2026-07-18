import type { SupportedLanguage } from "@/types/db";
import type { LocaleDictionary } from "./locales/types";
import { en } from "./locales/en";
import { te } from "./locales/te";

const LOCALES: Record<SupportedLanguage, LocaleDictionary> = { en, te };

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

/**
 * Looks up a chrome string for the bot's UI (menu labels, headers, fallback
 * text — never admin-authored CMS content, see locales/types.ts) and
 * interpolates `{token}` placeholders. Never throws: `LocaleDictionary`
 * makes a missing key a compile-time error, but if one somehow slips through
 * at runtime (e.g. a bad manual edit), this logs loudly and falls back to
 * English, then to the raw key, rather than crashing a reply mid-send.
 */
export function t(
  lang: SupportedLanguage,
  key: keyof LocaleDictionary,
  params?: Record<string, string | number>,
): string {
  const dictionary = LOCALES[lang] as Partial<LocaleDictionary>;
  let value = dictionary[key];
  if (!value) {
    console.error(`[i18n] missing key "${key}" for lang "${lang}"`);
    value = LOCALES[DEFAULT_LANGUAGE][key] || key;
  }

  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, token: string) =>
    token in params ? String(params[token]) : match,
  );
}
