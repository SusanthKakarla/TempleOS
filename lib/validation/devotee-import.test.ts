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
    donation: null,
    donationDate: null,
    ...overrides,
  };
}

describe("validateImportRow", () => {
  it("accepts a fully valid row", () => {
    const result = validateImportRow(2, row());
    expect(result.status).toBe("valid");
    expect(result.errors).toEqual([]);
    expect(result.normalizedPhone).toBe("+919876500000");
    expect(result.data.displayName).toBe("Ravi Kumar");
  });

  it("marks a fully blank row as empty, not invalid", () => {
    const result = validateImportRow(3, row({ name: "", phone: "", dob: "", birthStar: "", gothram: "" }));
    expect(result.status).toBe("empty");
    expect(result.errors).toEqual([]);
  });

  it("flags a missing name as invalid", () => {
    const result = validateImportRow(4, row({ name: "" }));
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Name is required");
  });

  it("accepts a missing phone for an individual row — phone number is always optional (Scenario 2/Case 3/5)", () => {
    const result = validateImportRow(5, row({ phone: "" }));
    expect(result.status).toBe("valid");
    expect(result.data.whatsappPhone).toBe("");
    expect(result.normalizedPhone).toBeNull();
  });

  it("flags an unparseable (non-blank) phone number as invalid", () => {
    const result = validateImportRow(6, row({ phone: "not-a-phone" }));
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Invalid WhatsApp number");
    expect(result.normalizedPhone).toBeNull();
  });

  it("accepts a valid YYYY-MM-DD date-of-birth string", () => {
    const result = validateImportRow(7, row({ dob: "1990-05-15" }));
    expect(result.status).toBe("valid");
    expect(result.data.dateOfBirth).toBe("1990-05-15");
  });

  it("flags a malformed date-of-birth string as invalid", () => {
    const result = validateImportRow(8, row({ dob: "15/05/1990" }));
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Invalid date of birth (expected YYYY-MM-DD)");
  });

  it("reads a native Excel Date-object date-of-birth cell via its UTC components", () => {
    // A true Excel date-typed cell parses as a Date, not a string.
    const result = validateImportRow(9, row({ dob: new Date(Date.UTC(1990, 4, 15)) }));
    expect(result.status).toBe("valid");
    expect(result.data.dateOfBirth).toBe("1990-05-15");
  });

  it("never treats a repeated phone number as a duplicate — every row is its own devotee (migration 036)", () => {
    // Two rows with the exact same phone both come back "valid" — there is
    // no seenPhones/existingPhones concept anymore, since phone number is
    // contact info only, never an identity/dedup key.
    const first = validateImportRow(10, row({ name: "Ram Kumar" }));
    const second = validateImportRow(11, row({ name: "Lakshmi" }));
    expect(first.status).toBe("valid");
    expect(second.status).toBe("valid");
    expect(first.normalizedPhone).toBe(second.normalizedPhone);
    expect(first.data.displayName).not.toBe(second.data.displayName);
  });

  it("trims optional birthStar/ancestralLineage and normalizes empty strings to null", () => {
    const result = validateImportRow(12, row({ birthStar: "  Ashwini  ", gothram: "" }));
    expect(result.data.birthStar).toBe("Ashwini");
    expect(result.data.ancestralLineage).toBeNull();
  });

  it("does not require a phone number for a family member row", () => {
    const result = validateImportRow(13, row({ phone: "", familyName: "Reddy Family", relationship: "Son" }));
    expect(result.status).toBe("valid");
    expect(result.data.registrationType).toBe("family");
    expect(result.data.relationship).toBe("son");
  });

  it("requires a relationship when a family name is given", () => {
    const result = validateImportRow(14, row({ familyName: "Reddy Family", relationship: "" }));
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Relationship is required when Family Name is set");
  });

  it("flags an unrecognized relationship", () => {
    const result = validateImportRow(15, row({ familyName: "Reddy Family", relationship: "Neighbor" }));
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain('Unknown relationship "Neighbor"');
  });

  it("normalizes a relationship with spaces to its snake_case code", () => {
    const result = validateImportRow(16, row({ familyName: "Reddy Family", relationship: "Head of Family" }));
    expect(result.data.relationship).toBe("head_of_family");
  });

  it("flags an unrecognized gender or marital status", () => {
    const result = validateImportRow(17, row({ gender: "nonbinary-typo" }));
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain('Unknown gender "nonbinary-typo"');
  });

  it("parses a valid wedding anniversary date", () => {
    const result = validateImportRow(18, row({ anniversary: "2000-02-14" }));
    expect(result.data.weddingAnniversary).toBe("2000-02-14");
  });

  it("imports the devotee as normal when donation columns are absent", () => {
    const result = validateImportRow(19, row());
    expect(result.status).toBe("valid");
    expect(result.data.donationAmount).toBeNull();
    expect(result.data.donationDate).toBeNull();
    expect(result.errors).toEqual([]);
  });

  it("parses a valid donation amount and date", () => {
    const result = validateImportRow(20, row({ donation: "1,500", donationDate: "2026-01-15" }));
    expect(result.status).toBe("valid");
    expect(result.data.donationAmount).toBe(1500);
    expect(result.data.donationDate).toBe("2026-01-15");
  });

  it("still imports the devotee when the donation amount is malformed, flagging it without invalidating the row", () => {
    const result = validateImportRow(21, row({ donation: "not-a-number" }));
    expect(result.status).toBe("valid");
    expect(result.data.donationAmount).toBeNull();
    expect(result.errors).toContain("Donation amount must be a positive number");
  });

  it("still imports the devotee when the donation date is malformed, flagging it without invalidating the row", () => {
    const result = validateImportRow(22, row({ donation: 500, donationDate: "15/01/2026" }));
    expect(result.status).toBe("valid");
    expect(result.data.donationAmount).toBe(500);
    expect(result.data.donationDate).toBeNull();
    expect(result.errors).toContain("Invalid donation date (expected YYYY-MM-DD)");
  });

  it("rejects a zero or negative donation amount", () => {
    expect(validateImportRow(23, row({ donation: 0 })).data.donationAmount).toBeNull();
    expect(validateImportRow(24, row({ donation: -50 })).data.donationAmount).toBeNull();
  });

  it("still surfaces a donation issue on an otherwise-invalid row alongside the devotee error", () => {
    const result = validateImportRow(25, row({ name: "", donation: "bad" }));
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Name is required");
    expect(result.errors).toContain("Donation amount must be a positive number");
  });

  it("Case 3: warns (non-blocking) when a row has a donation but no phone number", () => {
    const result = validateImportRow(26, row({ phone: "", donation: 5000 }));
    expect(result.status).toBe("valid");
    expect(result.data.donationAmount).toBe(5000);
    expect(result.errors).toContain("Phone number is missing. The devotee has been created without a phone number.");
  });

  it("Case 5: warns (non-blocking) when a row has neither a phone number nor a donation", () => {
    const result = validateImportRow(27, row({ phone: "", donation: null }));
    expect(result.status).toBe("valid");
    expect(result.errors).toContain("This devotee has no phone number and no donations.");
  });

  it("Case 4: no warning at all when phone is present but donation is absent", () => {
    const result = validateImportRow(28, row({ donation: null }));
    expect(result.status).toBe("valid");
    expect(result.errors).toEqual([]);
  });

  it("does not show the 'no phone and no donations' warning when the donation was merely malformed, not absent", () => {
    const result = validateImportRow(29, row({ phone: "", donation: "not-a-number" }));
    expect(result.status).toBe("valid");
    expect(result.errors).toContain("Donation amount must be a positive number");
    expect(result.errors).not.toContain("This devotee has no phone number and no donations.");
    expect(result.errors).not.toContain("Phone number is missing. The devotee has been created without a phone number.");
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
        donationAmount: null,
        donationDate: null,
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
        donationAmount: null,
        donationDate: null,
      },
      normalizedPhone: "+919876500000",
      status: "valid",
      errors: [],
    };
    const result = validateFamilyGroups([individualRow]);
    expect(result).toEqual([individualRow]);
  });
});
