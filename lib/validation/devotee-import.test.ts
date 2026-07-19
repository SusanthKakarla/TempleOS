import { describe, expect, it } from "vitest";
import { validateImportRow, type RawImportRow } from "./devotee-import";

function row(overrides: Partial<RawImportRow> = {}): RawImportRow {
  return {
    name: "Ravi Kumar",
    phone: "+919876500000",
    dob: null,
    birthStar: null,
    gothram: null,
    ...overrides,
  };
}

describe("validateImportRow", () => {
  it("accepts a fully valid row", () => {
    const result = validateImportRow(2, row(), new Set(), new Set());
    expect(result.status).toBe("valid");
    expect(result.errors).toEqual([]);
    expect(result.normalizedPhone).toBe("+919876500000");
    expect(result.data.displayName).toBe("Ravi Kumar");
  });

  it("marks a fully blank row as empty, not invalid", () => {
    const result = validateImportRow(3, row({ name: "", phone: "", dob: "", birthStar: "", gothram: "" }), new Set(), new Set());
    expect(result.status).toBe("empty");
    expect(result.errors).toEqual([]);
  });

  it("flags a missing name as invalid", () => {
    const result = validateImportRow(4, row({ name: "" }), new Set(), new Set());
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Name is required");
  });

  it("flags a missing phone as invalid", () => {
    const result = validateImportRow(5, row({ phone: "" }), new Set(), new Set());
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("WhatsApp phone is required");
  });

  it("flags an unparseable phone number as invalid", () => {
    const result = validateImportRow(6, row({ phone: "not-a-phone" }), new Set(), new Set());
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Invalid WhatsApp number");
    expect(result.normalizedPhone).toBeNull();
  });

  it("accepts a valid YYYY-MM-DD date-of-birth string", () => {
    const result = validateImportRow(7, row({ dob: "1990-05-15" }), new Set(), new Set());
    expect(result.status).toBe("valid");
    expect(result.data.dateOfBirth).toBe("1990-05-15");
  });

  it("flags a malformed date-of-birth string as invalid", () => {
    const result = validateImportRow(8, row({ dob: "15/05/1990" }), new Set(), new Set());
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Invalid date of birth (expected YYYY-MM-DD)");
  });

  it("reads a native Excel Date-object date-of-birth cell via its UTC components", () => {
    // A true Excel date-typed cell parses as a Date, not a string.
    const result = validateImportRow(9, row({ dob: new Date(Date.UTC(1990, 4, 15)) }), new Set(), new Set());
    expect(result.status).toBe("valid");
    expect(result.data.dateOfBirth).toBe("1990-05-15");
  });

  it("flags a phone already seen earlier in the same file as duplicate_in_file", () => {
    const seenPhones = new Set(["+919876500000"]);
    const result = validateImportRow(10, row(), seenPhones, new Set());
    expect(result.status).toBe("duplicate_in_file");
  });

  it("flags a phone that already exists in the database as duplicate_in_db", () => {
    const existingPhones = new Set(["+919876500000"]);
    const result = validateImportRow(11, row(), new Set(), existingPhones);
    expect(result.status).toBe("duplicate_in_db");
  });

  it("trims optional birthStar/ancestralLineage and normalizes empty strings to null", () => {
    const result = validateImportRow(12, row({ birthStar: "  Ashwini  ", gothram: "" }), new Set(), new Set());
    expect(result.data.birthStar).toBe("Ashwini");
    expect(result.data.ancestralLineage).toBeNull();
  });
});
