import { describe, expect, it } from "vitest";
import { computeNextRunAt } from "./recurrence";

describe("computeNextRunAt", () => {
  const from = new Date("2026-01-15T10:00:00Z");

  it("advances daily by exactly one day", () => {
    const next = computeNextRunAt("daily", from);
    expect(next?.toISOString()).toBe("2026-01-16T10:00:00.000Z");
  });

  it("advances weekly by exactly seven days", () => {
    const next = computeNextRunAt("weekly", from);
    expect(next?.toISOString()).toBe("2026-01-22T10:00:00.000Z");
  });

  it("advances monthly by exactly one calendar month", () => {
    const next = computeNextRunAt("monthly", from);
    expect(next?.toISOString()).toBe("2026-02-15T10:00:00.000Z");
  });

  it("returns null for an unrecognized rule rather than guessing", () => {
    expect(computeNextRunAt("yearly", from)).toBeNull();
  });
});
