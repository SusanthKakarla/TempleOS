import { describe, expect, it } from "vitest";
import { validateFamilyGroups, validateImportRow, type PreviewRow, type RawImportRow } from "./devotee-import";

function row(overrides: Partial<RawImportRow> = {}): RawImportRow {
  return {
    name: "Ravi Kumar",
    phone: "+919876500000",
    dob: null,
    birthStar: null,
    gothram: null,
    registrationType: null,
    familyName: null,
    relationship: null,
    gender: null,
    maritalStatus: null,
    anniversary: null,
    address: null,
    city: null,
    state: null,
    pincode: null,
    primaryLanguage: null,
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

  it("does not require a phone number for a family member row", () => {
    const result = validateImportRow(
      13,
      row({ phone: "", familyName: "Reddy Family", relationship: "Son" }),
      new Set(),
      new Set(),
    );
    expect(result.status).toBe("valid");
    expect(result.data.registrationType).toBe("family");
    expect(result.data.relationship).toBe("son");
  });

  it("requires a relationship when a family name is given", () => {
    const result = validateImportRow(14, row({ familyName: "Reddy Family", relationship: "" }), new Set(), new Set());
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Relationship is required when Family Name is set");
  });

  it("flags an unrecognized relationship", () => {
    const result = validateImportRow(
      15,
      row({ familyName: "Reddy Family", relationship: "Neighbor" }),
      new Set(),
      new Set(),
    );
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain('Unknown relationship "Neighbor"');
  });

  it("normalizes a relationship with spaces to its snake_case code", () => {
    const result = validateImportRow(
      16,
      row({ familyName: "Reddy Family", relationship: "Head of Family" }),
      new Set(),
      new Set(),
    );
    expect(result.data.relationship).toBe("head_of_family");
  });

  it("flags an unrecognized gender or marital status", () => {
    const result = validateImportRow(17, row({ gender: "nonbinary-typo" }), new Set(), new Set());
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain('Unknown gender "nonbinary-typo"');
  });

  it("parses a valid wedding anniversary date", () => {
    const result = validateImportRow(18, row({ anniversary: "2000-02-14" }), new Set(), new Set());
    expect(result.data.weddingAnniversary).toBe("2000-02-14");
  });
});

describe("validateFamilyGroups", () => {
  function validRow(rowNumber: number, overrides: Partial<PreviewRow["data"]> = {}): PreviewRow {
    return {
      rowNumber,
      data: {
        displayName: "Member",
        whatsappPhone: "",
        dateOfBirth: null,
        birthStar: null,
        ancestralLineage: null,
        registrationType: "family",
        familyName: "Reddy Family",
        relationship: null,
        gender: null,
        maritalStatus: null,
        weddingAnniversary: null,
        address: null,
        city: null,
        state: null,
        pincode: null,
        primaryLanguage: null,
        ...overrides,
      },
      normalizedPhone: null,
      status: "valid",
      errors: [],
    };
  }

  it("leaves a group with exactly one Head of Family untouched", () => {
    const rows = [
      validRow(1, { relationship: "head_of_family" }),
      validRow(2, { relationship: "wife" }),
    ];
    const result = validateFamilyGroups(rows);
    expect(result).toEqual(rows);
  });

  it("invalidates every row in a group with zero Head of Family rows", () => {
    const rows = [validRow(1, { relationship: "wife" }), validRow(2, { relationship: "son" })];
    const result = validateFamilyGroups(rows);
    expect(result.every((r) => r.status === "invalid")).toBe(true);
    expect(result[0].errors).toContain('Family "Reddy Family" must have exactly one Head of Family');
  });

  it("invalidates every row in a group with more than one Head of Family", () => {
    const rows = [
      validRow(1, { relationship: "head_of_family" }),
      validRow(2, { relationship: "head_of_family" }),
    ];
    const result = validateFamilyGroups(rows);
    expect(result.every((r) => r.status === "invalid")).toBe(true);
  });

  it("groups family names case-insensitively and ignoring surrounding whitespace", () => {
    const rows = [
      validRow(1, { familyName: "Reddy Family", relationship: "head_of_family" }),
      validRow(2, { familyName: "  reddy family  ", relationship: "wife" }),
    ];
    const result = validateFamilyGroups(rows);
    expect(result.every((r) => r.status === "valid")).toBe(true);
  });

  it("does not touch rows outside any family group", () => {
    const individualRow: PreviewRow = {
      rowNumber: 1,
      data: {
        displayName: "Solo",
        whatsappPhone: "+919876500000",
        dateOfBirth: null,
        birthStar: null,
        ancestralLineage: null,
        registrationType: "individual",
        familyName: null,
        relationship: null,
        gender: null,
        maritalStatus: null,
        weddingAnniversary: null,
        address: null,
        city: null,
        state: null,
        pincode: null,
        primaryLanguage: null,
      },
      normalizedPhone: "+919876500000",
      status: "valid",
      errors: [],
    };
    const result = validateFamilyGroups([individualRow]);
    expect(result).toEqual([individualRow]);
  });
});
