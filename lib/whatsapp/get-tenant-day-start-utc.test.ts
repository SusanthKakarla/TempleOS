import { afterEach, describe, expect, it, vi } from "vitest";
import { getTenantDayStartUTC } from "./templates";

describe("getTenantDayStartUTC", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns exact midnight UTC when the timezone is UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T10:00:00.000Z"));
    expect(getTenantDayStartUTC("UTC").toISOString()).toBe("2026-07-19T00:00:00.000Z");
  });

  it("returns the correct UTC instant for Asia/Kolkata's midnight (UTC+5:30, no DST)", () => {
    vi.useFakeTimers();
    // 10:00 UTC = 15:30 IST, still July 19 locally.
    vi.setSystemTime(new Date("2026-07-19T10:00:00.000Z"));
    // Midnight IST on July 19 is 18:30 UTC on July 18.
    expect(getTenantDayStartUTC("Asia/Kolkata").toISOString()).toBe("2026-07-18T18:30:00.000Z");
  });

  it("rolls over to the next tenant-local day correctly near the UTC boundary", () => {
    vi.useFakeTimers();
    // 20:00 UTC = 01:30 IST the *next* day.
    vi.setSystemTime(new Date("2026-07-19T20:00:00.000Z"));
    expect(getTenantDayStartUTC("Asia/Kolkata").toISOString()).toBe("2026-07-19T18:30:00.000Z");
  });
});
