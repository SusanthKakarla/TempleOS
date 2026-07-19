import { describe, expect, it } from "vitest";
import type { DonationWithDonor } from "@/types/db";
import { DONATION_EXPORT_COLUMNS } from "./donations";

function makeDonation(overrides: Partial<DonationWithDonor> = {}): DonationWithDonor {
  return {
    id: "donation-1",
    tenantId: "tenant-1",
    devoteeId: "devotee-1",
    amount: "500.00",
    purpose: "General",
    paymentMethod: "upi",
    notes: null,
    donatedAt: "2026-01-15T00:00:00.000Z",
    recordedBy: null,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    donorName: "Lakshmi Devi",
    donorPhone: "+919123456789",
    ...overrides,
  };
}

function accessorFor(key: string) {
  const column = DONATION_EXPORT_COLUMNS.find((c) => c.key === key);
  if (!column) throw new Error(`No export column with key "${key}"`);
  return column.accessor;
}

describe("DONATION_EXPORT_COLUMNS", () => {
  it("formats the amount as currency", () => {
    expect(accessorFor("amount")(makeDonation({ amount: "500.00" }))).toContain("500");
  });

  it("maps payment method codes to readable labels", () => {
    expect(accessorFor("paymentMethod")(makeDonation({ paymentMethod: "upi" }))).toBe("UPI");
    expect(accessorFor("paymentMethod")(makeDonation({ paymentMethod: "bank_transfer" }))).toBe("Bank Transfer");
  });

  it("falls back to an em dash when notes are unset", () => {
    expect(accessorFor("notes")(makeDonation({ notes: null }))).toBe("—");
  });
});
