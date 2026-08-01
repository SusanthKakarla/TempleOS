import { describe, expect, it } from "vitest";
import { validateImportRow, type RawImportRow } from "./donation-import";

function row(overrides: Partial<RawImportRow> = {}): RawImportRow {
  return {
    donorName: "Ravi Kumar",
    donorPhone: "+919876500000",
    donorEmail: null,
    amount: 500,
    purpose: "General Donation",
    paymentMethod: "cash",
    donatedAt: "2026-01-15",
    notes: null,
    ...overrides,
  };
}

describe("validateImportRow", () => {
  it("accepts a fully valid row", () => {
    const result = validateImportRow(2, row());
    expect(result.status).toBe("valid");
    expect(result.errors).toEqual([]);
    expect(result.data).toEqual({
      donorName: "Ravi Kumar",
      donorPhone: "+919876500000",
      donorEmail: "",
      amount: 500,
      purpose: "General Donation",
      paymentMethod: "cash",
      donatedAt: "2026-01-15",
      notes: "",
    });
    expect(result.normalizedPhone).toBe("+919876500000");
  });

  it("marks a fully blank row as empty, not invalid", () => {
    const result = validateImportRow(
      3,
      row({ donorName: "", donorPhone: "", amount: "", purpose: "", paymentMethod: "", donatedAt: "" }),
    );
    expect(result.status).toBe("empty");
    expect(result.errors).toEqual([]);
  });

  it("flags a missing donor name as invalid", () => {
    const result = validateImportRow(4, row({ donorName: "" }));
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Donor name is required");
  });

  it("does not require a phone number — donations can be recorded without one", () => {
    const result = validateImportRow(5, row({ donorPhone: "" }));
    expect(result.status).toBe("valid");
    expect(result.normalizedPhone).toBeNull();
  });

  it("flags an unparseable phone number as invalid", () => {
    const result = validateImportRow(6, row({ donorPhone: "not-a-phone" }));
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Invalid phone number");
  });

  it("flags a missing, zero, or negative amount as invalid", () => {
    expect(validateImportRow(7, row({ amount: "" })).errors).toContain("Amount is required");
    expect(validateImportRow(8, row({ amount: 0 })).errors).toContain("Amount must be a positive number");
    expect(validateImportRow(9, row({ amount: -50 })).errors).toContain("Amount must be a positive number");
  });

  it("accepts a comma-formatted amount string", () => {
    const result = validateImportRow(10, row({ amount: "1,500" }));
    expect(result.status).toBe("valid");
    expect(result.data.amount).toBe(1500);
  });

  it("accepts a missing purpose — purpose is optional", () => {
    const result = validateImportRow(11, row({ purpose: "" }));
    expect(result.status).toBe("valid");
    expect(result.data.purpose).toBe("");
  });

  it("accepts case-insensitive, space-separated payment method aliases", () => {
    const result = validateImportRow(12, row({ paymentMethod: "Bank Transfer" }));
    expect(result.status).toBe("valid");
    expect(result.data.paymentMethod).toBe("bank_transfer");
  });

  it("rejects 'razorpay' as an import-time payment method", () => {
    const result = validateImportRow(13, row({ paymentMethod: "razorpay" }));
    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("Unknown payment method"))).toBe(true);
  });

  it("flags an unrecognized payment method as invalid", () => {
    const result = validateImportRow(14, row({ paymentMethod: "bitcoin" }));
    expect(result.status).toBe("invalid");
  });

  it("accepts a missing payment method — payment method is optional", () => {
    const result = validateImportRow(15, row({ paymentMethod: "" }));
    expect(result.status).toBe("valid");
    expect(result.data.paymentMethod).toBeNull();
  });

  it("accepts a valid YYYY-MM-DD donation date", () => {
    const result = validateImportRow(16, row({ donatedAt: "2026-02-01" }));
    expect(result.status).toBe("valid");
    expect(result.data.donatedAt).toBe("2026-02-01");
  });

  it("flags a malformed donation date as invalid", () => {
    const result = validateImportRow(17, row({ donatedAt: "01/02/2026" }));
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Invalid date (expected YYYY-MM-DD)");
  });

  it("reads a native Excel Date-object donation date via its UTC components", () => {
    const result = validateImportRow(18, row({ donatedAt: new Date(Date.UTC(2026, 1, 1)) }));
    expect(result.status).toBe("valid");
    expect(result.data.donatedAt).toBe("2026-02-01");
  });

  it("accepts a missing donation date — date is optional", () => {
    const result = validateImportRow(19, row({ donatedAt: "" }));
    expect(result.status).toBe("valid");
    expect(result.data.donatedAt).toBeNull();
  });

  it("accepts a row with only donor name and amount — every other column is optional", () => {
    const result = validateImportRow(20, {
      donorName: "Anonymous Well-Wisher",
      donorPhone: null,
      donorEmail: null,
      amount: 250,
      purpose: null,
      paymentMethod: null,
      donatedAt: null,
      notes: null,
    });
    expect(result.status).toBe("valid");
    expect(result.errors).toEqual([]);
    expect(result.data).toEqual({
      donorName: "Anonymous Well-Wisher",
      donorPhone: "",
      donorEmail: "",
      amount: 250,
      purpose: "",
      paymentMethod: null,
      donatedAt: null,
      notes: "",
    });
  });
});
