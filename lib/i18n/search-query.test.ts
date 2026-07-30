import { beforeEach, describe, expect, it, vi } from "vitest";
import { translateBatch } from "./google-translate-client";
import { containsTeluguScript, toEnglishSearchQuery } from "./search-query";

vi.mock("./google-translate-client", () => ({ translateBatch: vi.fn() }));

describe("containsTeluguScript", () => {
  it.each([
    ["Temple", false],
    ["Ramesh Reddy", false],
    ["12345", false],
    ["దేవాలయం", true],
    ["Temple దేవాలయం", true],
  ])("containsTeluguScript(%s) === %s", (query, expected) => {
    expect(containsTeluguScript(query)).toBe(expected);
  });
});

describe("toEnglishSearchQuery", () => {
  beforeEach(() => {
    vi.mocked(translateBatch).mockReset();
  });

  it("returns the query untouched and never calls the API for pure English text", async () => {
    const result = await toEnglishSearchQuery("Temple");
    expect(result).toBe("Temple");
    expect(translateBatch).not.toHaveBeenCalled();
  });

  it("translates a Telugu-script query to English via a Telugu->English call", async () => {
    vi.mocked(translateBatch).mockResolvedValue({ ok: true, translations: ["Temple"] });

    const result = await toEnglishSearchQuery("దేవాలయం");

    expect(result).toBe("Temple");
    expect(translateBatch).toHaveBeenCalledWith(["దేవాలయం"], "en", "te");
  });
});
