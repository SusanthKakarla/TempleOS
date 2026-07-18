import { describe, expect, it } from "vitest";
import { isCloseAfterOpen, nullableTimeOfDay } from "./temple-time";

describe("nullableTimeOfDay", () => {
  it("accepts a valid HH:mm time", () => {
    expect(nullableTimeOfDay.parse("06:00")).toBe("06:00");
    expect(nullableTimeOfDay.parse("23:59")).toBe("23:59");
    expect(nullableTimeOfDay.parse("00:00")).toBe("00:00");
  });

  it("converts an empty string to null", () => {
    expect(nullableTimeOfDay.parse("")).toBeNull();
    expect(nullableTimeOfDay.parse("   ")).toBeNull();
  });

  it("rejects an invalid time", () => {
    expect(nullableTimeOfDay.safeParse("24:00").success).toBe(false);
    expect(nullableTimeOfDay.safeParse("6:00").success).toBe(false);
    expect(nullableTimeOfDay.safeParse("06:60").success).toBe(false);
    expect(nullableTimeOfDay.safeParse("not-a-time").success).toBe(false);
  });
});

describe("isCloseAfterOpen", () => {
  it("passes when close is after open", () => {
    expect(isCloseAfterOpen("06:00", "12:00")).toBe(true);
  });

  it("fails when close is before or equal to open", () => {
    expect(isCloseAfterOpen("12:00", "06:00")).toBe(false);
    expect(isCloseAfterOpen("06:00", "06:00")).toBe(false);
  });

  it("skips the check when either side is unset", () => {
    expect(isCloseAfterOpen(null, "12:00")).toBe(true);
    expect(isCloseAfterOpen("06:00", null)).toBe(true);
    expect(isCloseAfterOpen(undefined, undefined)).toBe(true);
  });
});
