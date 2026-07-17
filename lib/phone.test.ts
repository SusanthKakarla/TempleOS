import { describe, expect, it } from "vitest";
import { normalizePhoneNumber, normalizeWhatsAppId } from "./phone.mts";

describe("normalizePhoneNumber", () => {
  it("normalizes a local Indian number to E.164", () => {
    expect(normalizePhoneNumber("9876543210")).toBe("+919876543210");
  });

  it("accepts an already E.164 number", () => {
    expect(normalizePhoneNumber("+919876543210")).toBe("+919876543210");
  });

  it("returns null for invalid input", () => {
    expect(normalizePhoneNumber("not a phone")).toBeNull();
    expect(normalizePhoneNumber("")).toBeNull();
  });
});

describe("normalizeWhatsAppId", () => {
  it("adds a leading + to a raw wa_id", () => {
    expect(normalizeWhatsAppId("919876543210")).toBe("+919876543210");
  });

  it("strips non-digit characters before normalizing", () => {
    expect(normalizeWhatsAppId("+91 98765 43210")).toBe("+919876543210");
  });
});
