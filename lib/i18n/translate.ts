import { createHash } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { translateBatch } from "./google-translate-client";

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

interface CacheRow {
  source_hash: string;
  translated_text: string;
}

/**
 * Batch-translates English free text to Telugu, backed by the global
 * `translation_cache` table (see migrations/034_translation_cache.sql).
 * Callers must only invoke this when the dashboard locale is "te" — there
 * is no "en" branch here by design, so the default-locale path never
 * imports the DB/API cost of this module at all (enforced at each call
 * site, e.g. lib/i18n/translate-rows.ts).
 *
 * Never throws: a Google API failure falls back to the original English
 * text for whichever entries were cache misses (cache hits still return
 * translated) — a translation outage must never break a page render.
 */
export async function translateMany(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];

  const uniqueTexts = [...new Set(texts)];
  const hashByText = new Map(uniqueTexts.map((text) => [text, sha256(text)] as const));
  const hashes = [...hashByText.values()];

  const { rows } = await getPool().query<CacheRow>(
    "SELECT source_hash, translated_text FROM translation_cache WHERE target_locale = 'te' AND source_hash = ANY($1::text[])",
    [hashes],
  );
  const translatedByHash = new Map(rows.map((row) => [row.source_hash, row.translated_text] as const));

  const missingTexts = uniqueTexts.filter((text) => !translatedByHash.has(hashByText.get(text)!));

  if (missingTexts.length > 0) {
    const result = await translateBatch(missingTexts, "te");
    if (result.ok) {
      missingTexts.forEach((text, i) => {
        translatedByHash.set(hashByText.get(text)!, result.translations[i]);
      });
      await persistTranslations(missingTexts, hashByText, result.translations);
    } else {
      console.error("[i18n:translate] Google Translate batch failed, falling back to English:", result.error);
      missingTexts.forEach((text, i) => {
        translatedByHash.set(hashByText.get(text)!, result.translations[i]);
      });
    }
  }

  return texts.map((text) => translatedByHash.get(hashByText.get(text)!) ?? text);
}

export async function translateOne(text: string): Promise<string> {
  const [translated] = await translateMany([text]);
  return translated;
}

async function persistTranslations(
  texts: string[],
  hashByText: Map<string, string>,
  translations: string[],
): Promise<void> {
  const hashes = texts.map((text) => hashByText.get(text)!);
  try {
    await getPool().query(
      `INSERT INTO translation_cache (source_hash, source_text, translated_text)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[])
       ON CONFLICT (source_hash, target_locale) DO NOTHING`,
      [hashes, texts, translations],
    );
  } catch (err) {
    // A failed cache write must never surface as a translation failure to
    // the page — worst case, the same text gets re-translated next render.
    console.error("[i18n:translate] Failed to persist translation cache entries:", err);
  }
}
