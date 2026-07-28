import { describe, expect, it } from "vitest";
import { donationCheckoutSchema } from "./payments";

describe("donationCheckoutSchema", () => {
  const base = {
    amount: 501,
    donorName: "Ravi Kumar",
    donorPhone: "+919876543210",
  };

  it("accepts the minimal required fields", () => {
    const result = donationCheckoutSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("requires a mobile number", () => {
    const result = donationCheckoutSchema.safeParse({ amount: 501, donorName: "Ravi Kumar" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed mobile number", () => {
    const result = donationCheckoutSchema.safeParse({ ...base, donorPhone: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    const result = donationCheckoutSchema.safeParse({ ...base, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts a valid PAN and uppercases it", () => {
    const result = donationCheckoutSchema.safeParse({ ...base, donorPan: "aaaaa9999a" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.donorPan).toBe("AAAAA9999A");
    }
  });

  it("rejects a malformed PAN", () => {
    const result = donationCheckoutSchema.safeParse({ ...base, donorPan: "not-a-pan" });
    expect(result.success).toBe(false);
  });

  it("allows a null PAN (optional field)", () => {
    const result = donationCheckoutSchema.safeParse({ ...base, donorPan: null });
    expect(result.success).toBe(true);
  });

  it("accepts an optional donation message", () => {
    const result = donationCheckoutSchema.safeParse({ ...base, donationMessage: "In memory of Grandma" });
    expect(result.success).toBe(true);
  });

  it("rejects a donation message over 500 characters", () => {
    const result = donationCheckoutSchema.safeParse({ ...base, donationMessage: "a".repeat(501) });
    expect(result.success).toBe(false);
  });
});
