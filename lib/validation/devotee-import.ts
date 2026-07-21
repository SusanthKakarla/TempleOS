import { normalizePhoneNumber } from "@/lib/phone.mts";
import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  isRelationshipCode,
  type Gender,
  type MaritalStatus,
  type RelationshipCode,
  type SupportedLanguage,
} from "@/types/db";

export interface ImportRowData {
  displayName: string;
  whatsappPhone: string;
  dateOfBirth: string | null;
  birthStar: string | null;
  ancestralLineage: string | null;
  registrationType: "individual" | "family";
  familyName: string | null;
  relationship: RelationshipCode | null;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  weddingAnniversary: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  primaryLanguage: SupportedLanguage | null;
}

export type ImportRowStatus = "valid" | "invalid" | "duplicate_in_file" | "duplicate_in_db" | "empty";

export interface PreviewRow {
  rowNumber: number;
  data: ImportRowData;
  normalizedPhone: string | null;
  status: ImportRowStatus;
  errors: string[];
}

export interface RawImportRow {
  name: unknown;
  phone: unknown;
  dob: unknown;
  birthStar: unknown;
  gothram: unknown;
  registrationType: unknown;
  familyName: unknown;
  relationship: unknown;
  gender: unknown;
  maritalStatus: unknown;
  anniversary: unknown;
  address: unknown;
  city: unknown;
  state: unknown;
  pincode: unknown;
  primaryLanguage: unknown;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

/**
 * Handles both string cells (CSV, or a plain-text xlsx cell) and native
 * exceljs `Date` objects (a true Excel date-typed cell parses as a Date, not
 * a string) — exceljs decodes Excel date serials as UTC midnight, so we read
 * UTC components, not local ones, to avoid an off-by-one-day shift.
 */
function parseDateCell(value: unknown): string | "invalid" | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const str = String(value).trim();
  if (str === "") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : "invalid";
}

function emptyData(): ImportRowData {
  return {
    displayName: "",
    whatsappPhone: "",
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
  };
}

function parseLanguage(raw: string): SupportedLanguage | "invalid" | null {
  const normalized = raw.toLowerCase();
  if (normalized === "en" || normalized === "english") return "en";
  if (normalized === "te" || normalized === "telugu") return "te";
  return "invalid";
}

/**
 * Pure — the caller (app/api/devotees/import/preview/route.ts) owns the
 * `seenPhones` Set and adds each row's normalizedPhone to it after calling
 * this, so within-file duplicates are detected incrementally row by row.
 * `existingPhones` is fetched once for the whole batch before validating any
 * row (lib/db/devotees.ts's listExistingPhones).
 *
 * A row with a Family Name is a family member: its WhatsApp phone becomes
 * optional (family members may have none) and it must carry a recognized
 * Relationship. Family-level fields (address/city/state/pincode/primary
 * language) are read from every row but only actually used by the commit
 * route's Head of Family row — see validateFamilyGroups below for the
 * "exactly one head per family" cross-row check this function can't do
 * alone.
 */
export function validateImportRow(
  rowNumber: number,
  raw: RawImportRow,
  seenPhones: ReadonlySet<string>,
  existingPhones: ReadonlySet<string>,
): PreviewRow {
  const name = cellToString(raw.name);
  const phoneRaw = cellToString(raw.phone);
  const birthStar = cellToString(raw.birthStar) || null;
  const gothram = cellToString(raw.gothram) || null;
  const familyName = cellToString(raw.familyName) || null;
  const relationshipRaw = cellToString(raw.relationship);
  const genderRaw = cellToString(raw.gender).toLowerCase();
  const maritalStatusRaw = cellToString(raw.maritalStatus).toLowerCase();
  const address = cellToString(raw.address) || null;
  const city = cellToString(raw.city) || null;
  const state = cellToString(raw.state) || null;
  const pincode = cellToString(raw.pincode) || null;
  const primaryLanguageRaw = cellToString(raw.primaryLanguage);
  const dobIsBlank = raw.dob === null || raw.dob === undefined || raw.dob === "";
  const isFamilyRow = familyName !== null;

  if (!name && !phoneRaw && !birthStar && !gothram && dobIsBlank && !familyName && !relationshipRaw) {
    return { rowNumber, data: emptyData(), normalizedPhone: null, status: "empty", errors: [] };
  }

  const errors: string[] = [];
  if (!name) errors.push("Name is required");

  let normalizedPhone: string | null = null;
  if (phoneRaw) {
    normalizedPhone = normalizePhoneNumber(phoneRaw, "IN");
    if (!normalizedPhone) errors.push("Invalid WhatsApp number");
  } else if (!isFamilyRow) {
    errors.push("WhatsApp phone is required");
  }

  const dobResult = parseDateCell(raw.dob);
  if (dobResult === "invalid") errors.push("Invalid date of birth (expected YYYY-MM-DD)");
  const dateOfBirth = dobResult === "invalid" ? null : dobResult;

  const anniversaryResult = parseDateCell(raw.anniversary);
  if (anniversaryResult === "invalid") errors.push("Invalid wedding anniversary (expected YYYY-MM-DD)");
  const weddingAnniversary = anniversaryResult === "invalid" ? null : anniversaryResult;

  let relationship: RelationshipCode | null = null;
  if (isFamilyRow) {
    if (!relationshipRaw) {
      errors.push("Relationship is required when Family Name is set");
    } else {
      const normalized = relationshipRaw.toLowerCase().replace(/\s+/g, "_");
      if (isRelationshipCode(normalized)) {
        relationship = normalized;
      } else {
        errors.push(`Unknown relationship "${relationshipRaw}"`);
      }
    }
  }

  let gender: Gender | null = null;
  if (genderRaw) {
    if ((GENDER_OPTIONS as readonly string[]).includes(genderRaw)) {
      gender = genderRaw as Gender;
    } else {
      errors.push(`Unknown gender "${genderRaw}"`);
    }
  }

  let maritalStatus: MaritalStatus | null = null;
  if (maritalStatusRaw) {
    if ((MARITAL_STATUS_OPTIONS as readonly string[]).includes(maritalStatusRaw)) {
      maritalStatus = maritalStatusRaw as MaritalStatus;
    } else {
      errors.push(`Unknown marital status "${maritalStatusRaw}"`);
    }
  }

  let primaryLanguage: SupportedLanguage | null = null;
  if (primaryLanguageRaw) {
    const parsed = parseLanguage(primaryLanguageRaw);
    if (parsed === "invalid") {
      errors.push(`Unknown primary language "${primaryLanguageRaw}"`);
    } else {
      primaryLanguage = parsed;
    }
  }

  const data: ImportRowData = {
    displayName: name,
    whatsappPhone: phoneRaw,
    dateOfBirth,
    birthStar,
    ancestralLineage: gothram,
    registrationType: isFamilyRow ? "family" : "individual",
    familyName,
    relationship,
    gender,
    maritalStatus,
    weddingAnniversary,
    address,
    city,
    state,
    pincode,
    primaryLanguage,
  };

  if (errors.length > 0) {
    return { rowNumber, data, normalizedPhone, status: "invalid", errors };
  }
  if (normalizedPhone && seenPhones.has(normalizedPhone)) {
    return {
      rowNumber,
      data,
      normalizedPhone,
      status: "duplicate_in_file",
      errors: ["Duplicate phone number elsewhere in this file"],
    };
  }
  if (normalizedPhone && existingPhones.has(normalizedPhone)) {
    return {
      rowNumber,
      data,
      normalizedPhone,
      status: "duplicate_in_db",
      errors: ["A devotee with this phone number already exists"],
    };
  }

  return { rowNumber, data, normalizedPhone, status: "valid", errors: [] };
}

/**
 * Second pass, after every row has been validated individually: groups rows
 * by trimmed/case-insensitive Family Name and requires exactly one
 * Head of Family per group. A group that fails this has every one of its
 * rows marked invalid — this can't be checked per-row in validateImportRow
 * since it needs the whole file. Pure — returns a new array, doesn't mutate.
 */
export function validateFamilyGroups(rows: PreviewRow[]): PreviewRow[] {
  const groups = new Map<string, PreviewRow[]>();
  for (const row of rows) {
    if (!row.data.familyName) continue;
    const key = row.data.familyName.trim().toLowerCase();
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const invalidRowNumbers = new Set<number>();
  for (const group of groups.values()) {
    const headCount = group.filter((r) => r.data.relationship === "head_of_family").length;
    if (headCount !== 1) {
      for (const row of group) invalidRowNumbers.add(row.rowNumber);
    }
  }
  if (invalidRowNumbers.size === 0) return rows;

  return rows.map((row) => {
    if (!invalidRowNumbers.has(row.rowNumber)) return row;
    return {
      ...row,
      status: "invalid",
      errors: [...row.errors, `Family "${row.data.familyName}" must have exactly one Head of Family`],
    };
  });
}
