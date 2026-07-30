import { translateBatch } from "./google-translate-client";

const TELUGU_UNICODE_RANGE = /[ఀ-౿]/;

export function containsTeluguScript(query: string): boolean {
  return TELUGU_UNICODE_RANGE.test(query);
}

/**
 * Normalizes a search box query to English before it hits the existing
 * `ILIKE`-based search (all stored content is authored in English — see
 * lib/i18n/translate.ts's own English->Telugu-only direction). This is the
 * one deliberate exception to that direction: translating a user-typed
 * query is a different problem from translating stored content for
 * display, and search queries are too varied/low-reuse to be worth caching
 * in translation_cache — call Google directly, uncached.
 *
 * Only calls the API when the query actually contains Telugu script, so a
 * normal English search never incurs a network call.
 */
export async function toEnglishSearchQuery(query: string): Promise<string> {
  if (!containsTeluguScript(query)) return query;

  const result = await translateBatch([query], "en", "te");
  return result.translations[0];
}
