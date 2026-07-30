import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { translateBatch } from "./google-translate-client";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return { ok, status, json: async () => body } as Response;
}

describe("translateBatch", () => {
  beforeEach(() => {
    process.env.GOOGLE_TRANSLATE_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_TRANSLATE_API_KEY;
  });

  it("returns translations in order for a batched request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: { translations: [{ translatedText: "రైతు" }, { translatedText: "తల్లి" }] },
        }),
      ),
    );

    const result = await translateBatch(["Farmer", "Mother"], "te");

    expect(result).toEqual({ ok: true, translations: ["రైతు", "తల్లి"] });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = init!.body as URLSearchParams;
    expect(body.getAll("q")).toEqual(["Farmer", "Mother"]);
    expect(body.get("target")).toBe("te");
    expect(body.get("source")).toBe("en");
  });

  it("short-circuits with no network call for an empty batch", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await translateBatch([], "te");
    expect(result).toEqual({ ok: true, translations: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to the original texts, without a network call, when no API key is configured", async () => {
    delete process.env.GOOGLE_TRANSLATE_API_KEY;
    vi.stubGlobal("fetch", vi.fn());

    const result = await translateBatch(["Farmer"], "te");

    expect(result).toEqual({
      ok: false,
      translations: ["Farmer"],
      error: "GOOGLE_TRANSLATE_API_KEY is not configured",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to the original texts on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { message: "Invalid API key" } }, false, 400)));

    const result = await translateBatch(["Farmer"], "te");

    expect(result).toEqual({ ok: false, translations: ["Farmer"], error: "Invalid API key" });
  });

  it("falls back to the original texts when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await translateBatch(["Farmer"], "te");

    expect(result).toEqual({ ok: false, translations: ["Farmer"], error: "network down" });
  });

  it("falls back to the original texts when the response shape is unexpected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: { translations: [{ translatedText: "రైతు" }] } })));

    const result = await translateBatch(["Farmer", "Mother"], "te");

    expect(result.ok).toBe(false);
    expect(result.translations).toEqual(["Farmer", "Mother"]);
  });
});
