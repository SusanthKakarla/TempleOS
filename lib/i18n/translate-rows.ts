import type { SupportedLanguage } from "@/types/db";
import { translateMany } from "./translate";

/**
 * Translates the named free-text fields of every row to Telugu, in a single
 * batched call regardless of row count. Returns `rows` completely untouched
 * when `locale === "en"` — structurally guarantees the default-locale path
 * never imports the cache/API cost of lib/i18n/translate.ts.
 *
 * Only ever pass genuinely free-text fields here (names, descriptions,
 * custom notes) — never ids, phone numbers, enums, or other technical
 * values.
 */
export async function translateFields<T>(rows: T[], locale: SupportedLanguage, fields: (keyof T)[]): Promise<T[]> {
  if (locale === "en" || rows.length === 0 || fields.length === 0) return rows;

  const values: string[] = [];
  for (const row of rows) {
    for (const field of fields) {
      const value = row[field];
      if (typeof value === "string" && value.length > 0) values.push(value);
    }
  }
  if (values.length === 0) return rows;

  const translations = await translateMany(values);
  const translatedByOriginal = new Map(values.map((value, i) => [value, translations[i]] as const));

  return rows.map((row) => {
    const translatedRow = { ...row };
    for (const field of fields) {
      const value = row[field];
      if (typeof value === "string" && value.length > 0) {
        translatedRow[field] = (translatedByOriginal.get(value) ?? value) as T[typeof field];
      }
    }
    return translatedRow;
  });
}
