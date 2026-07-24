import { describe, expect, it } from "vitest";
import { classifyWhatsAppError, isPermanentWhatsAppError } from "./errors";

describe("isPermanentWhatsAppError", () => {
  it("classifies the re-engagement and unreachable-number codes as permanent", () => {
    expect(isPermanentWhatsAppError(131047)).toBe(true);
    expect(isPermanentWhatsAppError(131026)).toBe(true);
  });

  it("classifies template-validation codes as permanent", () => {
    expect(isPermanentWhatsAppError(132000)).toBe(true);
    expect(isPermanentWhatsAppError(132001)).toBe(true);
    expect(isPermanentWhatsAppError(132005)).toBe(true);
    expect(isPermanentWhatsAppError(132012)).toBe(true);
  });

  it("leaves ambiguous/unlisted codes on the retry path, conservatively", () => {
    expect(isPermanentWhatsAppError(100)).toBe(false);
    expect(isPermanentWhatsAppError(4)).toBe(false); // rate limit
    expect(isPermanentWhatsAppError(undefined)).toBe(false);
  });
});

describe("classifyWhatsAppError", () => {
  it("returns a human-readable category for permanent codes", () => {
    expect(classifyWhatsAppError(131047)).toBe("re_engagement");
    expect(classifyWhatsAppError(131026)).toBe("unreachable");
    expect(classifyWhatsAppError(132001)).toBe("template_not_approved");
    expect(classifyWhatsAppError(132000)).toBe("invalid_payload");
  });

  it("returns undefined for codes with no known classification", () => {
    expect(classifyWhatsAppError(100)).toBeUndefined();
    expect(classifyWhatsAppError(undefined)).toBeUndefined();
  });
});
