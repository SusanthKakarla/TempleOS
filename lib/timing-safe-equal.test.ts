import { describe, expect, it } from "vitest";
import { timingSafeEqualString } from "./timing-safe-equal";

describe("timingSafeEqualString", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqualString("secret-value", "secret-value")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeEqualString("secret-value", "secret-VALUE")).toBe(false);
  });

  it("returns false for strings of different lengths without throwing", () => {
    expect(timingSafeEqualString("short", "a-much-longer-value")).toBe(false);
  });

  it("returns false when compared against an empty string", () => {
    expect(timingSafeEqualString("non-empty", "")).toBe(false);
  });

  it("returns true for two empty strings", () => {
    expect(timingSafeEqualString("", "")).toBe(true);
  });
});
