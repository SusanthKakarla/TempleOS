import { describe, expect, it } from "vitest";
import { maskPhoneForDisplay } from "./phone.mts";

describe("maskPhoneForDisplay", () => {
  it("masks a 10-digit national number to first-5/last-2", () => {
    expect(maskPhoneForDisplay("9876543210")).toBe("98765••••10");
  });

  it("ignores a leading country code before masking", () => {
    expect(maskPhoneForDisplay("+919876543210")).toBe("98765••••10");
  });

  it("returns an em dash for null/undefined", () => {
    expect(maskPhoneForDisplay(null)).toBe("—");
    expect(maskPhoneForDisplay(undefined)).toBe("—");
  });

  it("returns the raw value unmasked when too short to mask meaningfully", () => {
    expect(maskPhoneForDisplay("12345")).toBe("12345");
  });
});
