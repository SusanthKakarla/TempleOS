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

  it("normalizes a bare 10-digit Indian number to full E.164 — otherwise it can never match this donor's actual whatsapp_messages history, which is always stored in E.164, breaking the 24h-conversation-window check", () => {
    const result = donationCheckoutSchema.safeParse({ ...base, donorPhone: "8464091436" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.donorPhone).toBe("+918464091436");
    }
  });

  it("leaves an already-E.164 number unchanged", () => {
    const result = donationCheckoutSchema.safeParse({ ...base, donorPhone: "+919876543210" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.donorPhone).toBe("+919876543210");
    }
  });

  it("rejects a number that matches the loose shape but isn't a real phone number", () => {
    const result = donationCheckoutSchema.safeParse({ ...base, donorPhone: "0000000" });
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
