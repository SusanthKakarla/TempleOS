import { describe, expect, it } from "vitest";
import { createDonationSchema, updateDonationSchema } from "./donations";

describe("createDonationSchema", () => {
  const base = {
    devoteeId: "8f14e45f-ceea-467e-adde-4d5e8b3f0a1c",
    amount: 501,
    purpose: "Annadanam",
    paymentMethod: "upi" as const,
    donatedAt: "2026-07-18T10:00:00.000Z",
  };

  it("accepts a minimal valid donation", () => {
    const result = createDonationSchema.parse(base);
    expect(result.amount).toBe(501);
    expect(result.notes).toBeUndefined();
  });

  it("rejects a non-uuid devoteeId", () => {
    const result = createDonationSchema.safeParse({ ...base, devoteeId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    const result = createDonationSchema.safeParse({ ...base, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = createDonationSchema.safeParse({ ...base, amount: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects a blank purpose", () => {
    const result = createDonationSchema.safeParse({ ...base, purpose: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid payment method", () => {
    const result = createDonationSchema.safeParse({ ...base, paymentMethod: "crypto" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid date string", () => {
    const result = createDonationSchema.safeParse({ ...base, donatedAt: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("converts an empty notes string to null", () => {
    const result = createDonationSchema.parse({ ...base, notes: "   " });
    expect(result.notes).toBeNull();
  });
});

describe("updateDonationSchema", () => {
  it("allows a partial update with only amount", () => {
    const result = updateDonationSchema.safeParse({ amount: 250 });
    expect(result.success).toBe(true);
  });

  it("rejects a zero amount on update", () => {
    const result = updateDonationSchema.safeParse({ amount: 0 });
    expect(result.success).toBe(false);
  });

  it("allows an empty payload (no-op update)", () => {
    const result = updateDonationSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
