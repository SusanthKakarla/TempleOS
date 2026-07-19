import { normalizePhoneNumber } from "@/lib/phone.mts";

export interface ImportRowData {
  displayName: string;
  whatsappPhone: string;
  dateOfBirth: string | null;
  birthStar: string | null;
  ancestralLineage: string | null;
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

/**
 * Pure — the caller (app/api/devotees/import/preview/route.ts) owns the
 * `seenPhones` Set and adds each row's normalizedPhone to it after calling
 * this, so within-file duplicates are detected incrementally row by row.
 * `existingPhones` is fetched once for the whole batch before validating any
 * row (lib/db/devotees.ts's listExistingPhones).
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
  const dobIsBlank = raw.dob === null || raw.dob === undefined || raw.dob === "";

  if (!name && !phoneRaw && !birthStar && !gothram && dobIsBlank) {
    return {
      rowNumber,
      data: { displayName: "", whatsappPhone: "", dateOfBirth: null, birthStar: null, ancestralLineage: null },
      normalizedPhone: null,
      status: "empty",
      errors: [],
    };
  }

  const errors: string[] = [];
  if (!name) errors.push("Name is required");

  let normalizedPhone: string | null = null;
  if (!phoneRaw) {
    errors.push("WhatsApp phone is required");
  } else {
    normalizedPhone = normalizePhoneNumber(phoneRaw, "IN");
    if (!normalizedPhone) errors.push("Invalid WhatsApp number");
  }

  const dobResult = parseDateCell(raw.dob);
  if (dobResult === "invalid") errors.push("Invalid date of birth (expected YYYY-MM-DD)");
  const dateOfBirth = dobResult === "invalid" ? null : dobResult;

  const data: ImportRowData = {
    displayName: name,
    whatsappPhone: phoneRaw,
    dateOfBirth,
    birthStar,
    ancestralLineage: gothram,
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
