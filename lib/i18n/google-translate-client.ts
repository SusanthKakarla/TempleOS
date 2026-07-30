const GOOGLE_TRANSLATE_ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

export interface TranslateBatchResult {
  ok: boolean;
  /** Same length/order as the input `texts` — falls back to the original text per-entry on failure. */
  translations: string[];
  error?: string;
}

/**
 * Thin, never-throwing wrapper over Google Cloud Translation API v2 (plain
 * REST + API key, no SDK — mirrors lib/whatsapp/client.ts's house style).
 * Batches the whole input into one request (Google's documented mechanism:
 * repeat the `q` param), since the caller (lib/i18n/translate.ts) already
 * collapses a whole page's cache misses into a single call here.
 */
export async function translateBatch(
  texts: string[],
  targetLocale: "en" | "te",
  source: "en" | "te" = "en",
): Promise<TranslateBatchResult> {
  if (texts.length === 0) return { ok: true, translations: [] };

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return { ok: false, translations: texts, error: "GOOGLE_TRANSLATE_API_KEY is not configured" };
  }

  try {
    const url = new URL(GOOGLE_TRANSLATE_ENDPOINT);
    url.searchParams.set("key", apiKey);
    const body = new URLSearchParams();
    for (const text of texts) body.append("q", text);
    body.append("target", targetLocale);
    body.append("source", source);
    body.append("format", "text");

    const response = await fetch(url, { method: "POST", body });
    const json = (await response.json().catch(() => ({}))) as {
      data?: { translations?: { translatedText: string }[] };
      error?: { message?: string };
    };

    if (!response.ok) {
      return { ok: false, translations: texts, error: json.error?.message ?? `HTTP ${response.status}` };
    }

    const translated = json.data?.translations?.map((t) => t.translatedText);
    if (!translated || translated.length !== texts.length) {
      return { ok: false, translations: texts, error: "Unexpected response shape from Google Translate" };
    }
    return { ok: true, translations: translated };
  } catch (err) {
    return { ok: false, translations: texts, error: err instanceof Error ? err.message : "Unknown translation error" };
  }
}
