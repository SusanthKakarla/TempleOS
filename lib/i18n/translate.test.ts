import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "@/lib/db/pool";
import { translateBatch } from "./google-translate-client";
import { translateMany, translateOne } from "./translate";

vi.mock("@/lib/db/pool", () => ({ getPool: vi.fn() }));
vi.mock("./google-translate-client", () => ({ translateBatch: vi.fn() }));

describe("translateMany", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
    vi.mocked(translateBatch).mockReset();
  });

  it("returns an empty array without any DB or API call for empty input", async () => {
    const result = await translateMany([]);
    expect(result).toEqual([]);
    expect(query).not.toHaveBeenCalled();
    expect(translateBatch).not.toHaveBeenCalled();
  });

  it("returns cached translations with zero API calls on an all-hit lookup", async () => {
    // sha256 is deterministic per input, so the mocked row must use the real hash of "Farmer".
    const { createHash } = await import("node:crypto");
    const hash = createHash("sha256").update("Farmer", "utf8").digest("hex");
    query.mockResolvedValueOnce({ rows: [{ source_hash: hash, translated_text: "రైతు" }] });

    const result = await translateMany(["Farmer"]);

    expect(result).toEqual(["రైతు"]);
    expect(translateBatch).not.toHaveBeenCalled();
  });

  it("calls translateBatch exactly once for all cache misses combined, and persists the results", async () => {
    query.mockResolvedValueOnce({ rows: [] }); // cache lookup: no hits
    query.mockResolvedValueOnce({ rows: [] }); // cache write
    vi.mocked(translateBatch).mockResolvedValue({ ok: true, translations: ["రైతు", "తల్లి"] });

    const result = await translateMany(["Farmer", "Mother"]);

    expect(result).toEqual(["రైతు", "తల్లి"]);
    expect(translateBatch).toHaveBeenCalledTimes(1);
    expect(translateBatch).toHaveBeenCalledWith(["Farmer", "Mother"], "te");
    // Second query call is the bulk cache-write.
    const [writeSql, writeParams] = query.mock.calls[1];
    expect(String(writeSql)).toContain("INSERT INTO translation_cache");
    expect(writeParams[1]).toEqual(["Farmer", "Mother"]);
    expect(writeParams[2]).toEqual(["రైతు", "తల్లి"]);
  });

  it("combines cache hits and misses, preserving input order and duplicates", async () => {
    const { createHash } = await import("node:crypto");
    const farmerHash = createHash("sha256").update("Farmer", "utf8").digest("hex");
    query.mockResolvedValueOnce({ rows: [{ source_hash: farmerHash, translated_text: "రైతు" }] });
    query.mockResolvedValueOnce({ rows: [] }); // cache write for the miss
    vi.mocked(translateBatch).mockResolvedValue({ ok: true, translations: ["తల్లి"] });

    const result = await translateMany(["Farmer", "Mother", "Farmer"]);

    expect(result).toEqual(["రైతు", "తల్లి", "రైతు"]);
    expect(translateBatch).toHaveBeenCalledWith(["Mother"], "te");
  });

  it("falls back to the original English text for misses when the API call fails, without throwing", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    vi.mocked(translateBatch).mockResolvedValue({ ok: false, translations: ["Farmer"], error: "quota exceeded" });

    const result = await translateMany(["Farmer"]);

    expect(result).toEqual(["Farmer"]);
    // No cache-write query should run for a failed translation.
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("translateOne is a thin wrapper returning the single translated string", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [] });
    vi.mocked(translateBatch).mockResolvedValue({ ok: true, translations: ["రైతు"] });

    const result = await translateOne("Farmer");

    expect(result).toBe("రైతు");
  });
});
