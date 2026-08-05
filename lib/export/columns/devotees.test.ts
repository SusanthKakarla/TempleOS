import { describe, expect, it } from "vitest";
import type { Devotee } from "@/types/db";
import { buildDevoteeExportColumns, type DevoteeExportLabels } from "./devotees";

const LABELS: DevoteeExportLabels = {
  headers: {
    name: "Name",
    phone: "Phone",
    whatsappOptIn: "WhatsApp Opt-in",
    language: "Language",
    donor: "Donor",
    totalDonated: "Total Donated",
    birthStar: "Birth Star",
    gothram: "Gothram",
    dateOfBirth: "Date of Birth",
    gender: "Gender",
    maritalStatus: "Marital Status",
    weddingAnniversary: "Wedding Anniversary",
    registrationType: "Registration Type",
    familyName: "Family Name",
    relationship: "Relationship",
    firstSeen: "First Seen",
    lastSeen: "Last Seen",
    address: "Address",
    notes: "Notes",
    createdDate: "Created Date",
    updatedDate: "Updated Date",
  },
  yes: "Yes",
  no: "No",
  individual: "Individual",
  family: "Family",
  relationshipLabels: { head_of_family: "Head of Family" },
  genderLabels: {},
  maritalStatusLabels: {},
};

const DEVOTEE_EXPORT_COLUMNS = buildDevoteeExportColumns(LABELS);

function makeDevotee(overrides: Partial<Devotee> = {}): Devotee {
  return {
    id: "devotee-1",
    tenantId: "tenant-1",
    whatsappPhone: "+919876500000",
    displayName: "Ravi Kumar",
    dateOfBirth: null,
    birthStar: null,
    ancestralLineage: null,
    firstSeenAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-01-02T00:00:00.000Z",
    lastInteractionType: null,
    whatsappOptInStatus: true,
    preferredLanguage: "te",
    isDonor: true,
    totalDonatedAmount: "1500.00",
    lastDonationAt: null,
    eventNotificationsEnabled: true,
    familyId: null,
    gender: null,
    maritalStatus: null,
    weddingAnniversary: null,
    address: null,
    notes: null,
    isActive: true,
    familyName: null,
    relationship: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function accessorFor(key: string) {
  const column = DEVOTEE_EXPORT_COLUMNS.find((c) => c.key === key);
  if (!column) throw new Error(`No export column with key "${key}"`);
  return column.accessor;
}

describe("DEVOTEE_EXPORT_COLUMNS", () => {
  it("formats opt-in status and language as readable text", () => {
    const devotee = makeDevotee();
    expect(accessorFor("whatsappOptInStatus")(devotee)).toBe("Yes");
    expect(accessorFor("preferredLanguage")(devotee)).toBe("TE");
  });

  it("falls back to an em dash for unset optional fields", () => {
    const devotee = makeDevotee({ preferredLanguage: null, birthStar: null, ancestralLineage: null });
    expect(accessorFor("preferredLanguage")(devotee)).toBe("—");
    expect(accessorFor("birthStar")(devotee)).toBe("—");
    expect(accessorFor("ancestralLineage")(devotee)).toBe("—");
  });

  it("returns the total donated amount as a real number, tagged for xlsx currency formatting (not a pre-formatted string)", () => {
    const devotee = makeDevotee({ totalDonatedAmount: "1500.00" });
    expect(accessorFor("totalDonatedAmount")(devotee)).toBe(1500);
    const column = DEVOTEE_EXPORT_COLUMNS.find((c) => c.key === "totalDonatedAmount");
    expect(column?.format).toBe("currency");
  });

  it("returns date fields as real Date objects, tagged for xlsx date formatting", () => {
    const devotee = makeDevotee({ dateOfBirth: "1990-05-20" });
    const value = accessorFor("dateOfBirth")(devotee);
    expect(value).toBeInstanceOf(Date);
    const column = DEVOTEE_EXPORT_COLUMNS.find((c) => c.key === "dateOfBirth");
    expect(column?.format).toBe("date");
  });

  it("falls back to an em dash (not null/NaN) for an unset date of birth", () => {
    const devotee = makeDevotee({ dateOfBirth: null });
    expect(accessorFor("dateOfBirth")(devotee)).toBe("—");
  });

  it("exposes the newly-added real-column fields: address, notes, createdAt, updatedAt", () => {
    const devotee = makeDevotee({ address: "12 Temple Street", notes: "Regular volunteer" });
    expect(accessorFor("address")(devotee)).toBe("12 Temple Street");
    expect(accessorFor("notes")(devotee)).toBe("Regular volunteer");
    expect(accessorFor("createdAt")(devotee)).toBeInstanceOf(Date);
    expect(accessorFor("updatedAt")(devotee)).toBeInstanceOf(Date);
  });

  it("labels an unlinked devotee as Individual with no family fields", () => {
    const devotee = makeDevotee();
    expect(accessorFor("registrationType")(devotee)).toBe("Individual");
    expect(accessorFor("familyName")(devotee)).toBe("—");
    expect(accessorFor("relationship")(devotee)).toBe("—");
  });

  it("labels a family member as Family with name and a readable relationship", () => {
    const devotee = makeDevotee({ familyId: "family-1", familyName: "Reddy Family", relationship: "head_of_family" });
    expect(accessorFor("registrationType")(devotee)).toBe("Family");
    expect(accessorFor("familyName")(devotee)).toBe("Reddy Family");
    expect(accessorFor("relationship")(devotee)).toBe("Head of Family");
  });
});
