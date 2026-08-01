import { describe, expect, it } from "vitest";
import { parseISODate, toISODateString } from "./date";

describe("parseISODate", () => {
  it("parses a date-only ISO string into a local-midnight Date", () => {
    const date = parseISODate("2026-03-05");
    expect(date).toBeInstanceOf(Date);
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(2);
    expect(date!.getDate()).toBe(5);
    expect(date!.getHours()).toBe(0);
  });

  it("parses the date part of a full ISO timestamp", () => {
    const date = parseISODate("2026-03-05T09:00:00.000Z");
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(2);
    expect(date!.getDate()).toBe(5);
  });

  it("returns undefined for empty, null, or malformed input", () => {
    expect(parseISODate("")).toBeUndefined();
    expect(parseISODate(null)).toBeUndefined();
    expect(parseISODate(undefined)).toBeUndefined();
    expect(parseISODate("not-a-date")).toBeUndefined();
  });
});

describe("toISODateString", () => {
  it("serializes a local Date to yyyy-MM-dd using its calendar fields", () => {
    expect(toISODateString(new Date(2026, 2, 5))).toBe("2026-03-05");
  });

  it("pads single-digit months and days", () => {
    expect(toISODateString(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("round-trips through parseISODate", () => {
    const original = "2026-12-31";
    expect(toISODateString(parseISODate(original)!)).toBe(original);
  });
});
