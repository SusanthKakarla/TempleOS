"use server";

import { setLocaleCookie } from "@/lib/i18n/locale";
import type { SupportedLanguage } from "@/types/db";

/**
 * Switches the language for a public visitor.
 *
 * Writes the same `templeos_locale` cookie the admin dashboard already uses,
 * so there is one language preference across both surfaces rather than a
 * second competing one — a temple admin who reads the site in Telugu lands in
 * a Telugu dashboard.
 *
 * Deliberately a server action rather than a fetch to /api/account/locale:
 * that route requires a tenant admin session (it also persists the choice to
 * the member's profile), and a devotee has none. The cookie is the whole
 * mechanism here, which also means the choice survives a reload and every
 * page is rendered in the chosen language on the server — no flash of English
 * and nothing for hydration to disagree about.
 *
 * The action validates rather than trusting its argument: it is a public
 * endpoint like any other, reachable by anyone on the temple's hostname.
 */
export async function setSiteLocale(locale: SupportedLanguage): Promise<void> {
  if (locale !== "en" && locale !== "te") return;
  await setLocaleCookie(locale);
}
