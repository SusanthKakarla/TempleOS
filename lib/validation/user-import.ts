import { normalizePhoneNumber } from "@/lib/phone.mts";
import { isRoleCode, type RoleCode } from "@/types/db";

export interface ImportRowData {
  displayName: string;
  phone: string;
  roles: RoleCode[];
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
  roles: unknown;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseRoleCodes(raw: unknown): { roles: RoleCode[]; invalid: string[] } {
  const str = cellToString(raw);
  if (!str) return { roles: [], invalid: [] };
  const tokens = str
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
  const roles: RoleCode[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    if (isRoleCode(token)) {
      if (!roles.includes(token)) roles.push(token);
    } else {
      invalid.push(token);
    }
  }
  return { roles, invalid };
}

/**
 * Pure — mirrors lib/validation/devotee-import.ts's shape. The caller
 * (app/api/users/import/preview/route.ts) owns the `seenPhones` Set,
 * `existingPhones` is active-membership phones for THIS tenant only
 * (persons are legitimately shared cross-tenant, so duplicate-checking is
 * scoped to tenant membership, not global phone uniqueness).
 */
export function validateImportRow(
  rowNumber: number,
  raw: RawImportRow,
  seenPhones: ReadonlySet<string>,
  existingPhones: ReadonlySet<string>,
): PreviewRow {
  const name = cellToString(raw.name);
  const phoneRaw = cellToString(raw.phone);
  const rolesRaw = cellToString(raw.roles);

  if (!name && !phoneRaw && !rolesRaw) {
    return {
      rowNumber,
      data: { displayName: "", phone: "", roles: [] },
      normalizedPhone: null,
      status: "empty",
      errors: [],
    };
  }

  const errors: string[] = [];
  if (!name) errors.push("Name is required");

  let normalizedPhone: string | null = null;
  if (!phoneRaw) {
    errors.push("Phone is required");
  } else {
    normalizedPhone = normalizePhoneNumber(phoneRaw, "IN");
    if (!normalizedPhone) errors.push("Invalid phone number");
  }

  const { roles, invalid } = parseRoleCodes(raw.roles);
  if (invalid.length > 0) errors.push(`Unknown role(s): ${invalid.join(", ")}`);
  if (roles.length === 0 && invalid.length === 0) errors.push("At least one role is required");

  const data: ImportRowData = { displayName: name, phone: phoneRaw, roles };

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
      errors: ["Already a member of this temple"],
    };
  }

  return { rowNumber, data, normalizedPhone, status: "valid", errors: [] };
}
