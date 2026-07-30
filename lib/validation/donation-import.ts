import { PAYMENT_METHOD_OPTIONS } from "@/features/donations/donation-options";
import { normalizePhoneNumber } from "@/lib/phone.mts";
import type { PaymentMethod } from "@/types/db";

/** PAYMENT_METHOD_OPTIONS is already the manual-entry set (no "razorpay" — that's reserved for online-gateway captures, never a value an admin types into an import sheet). */
const IMPORTABLE_PAYMENT_METHODS = PAYMENT_METHOD_OPTIONS.map((o) => o.value);

export interface ImportRowData {
  donorName: string;
  donorPhone: string;
  donorEmail: string;
  amount: number | null;
  purpose: string;
  paymentMethod: PaymentMethod | null;
  /** "YYYY-MM-DD" */
  donatedAt: string | null;
  notes: string;
}

export type ImportRowStatus = "valid" | "invalid" | "empty";

export interface PreviewRow {
  rowNumber: number;
  data: ImportRowData;
  /** Null when no phone was given, or the phone doesn't parse — donations don't require a phone (unlike devotees/users), so this is informational only, never a rejection reason on its own. */
  normalizedPhone: string | null;
  status: ImportRowStatus;
  errors: string[];
}

export interface RawImportRow {
  donorName: unknown;
  donorPhone: unknown;
  donorEmail: unknown;
  amount: unknown;
  purpose: unknown;
  paymentMethod: unknown;
  donatedAt: unknown;
  notes: unknown;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

/** Mirrors lib/validation/devotee-import.ts's parseDateCell exactly — same Excel-date-serial UTC handling. */
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

function parsePaymentMethod(raw: unknown): PaymentMethod | "invalid" | null {
  const str = cellToString(raw).toLowerCase().replace(/\s+/g, "_");
  if (!str) return null;
  return (IMPORTABLE_PAYMENT_METHODS as readonly string[]).includes(str) ? (str as PaymentMethod) : "invalid";
}

function parseAmount(raw: unknown): number | "invalid" | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").trim());
  if (Number.isNaN(value)) return "invalid";
  return value > 0 ? value : "invalid";
}

function emptyData(): ImportRowData {
  return {
    donorName: "",
    donorPhone: "",
    donorEmail: "",
    amount: null,
    purpose: "",
    paymentMethod: null,
    donatedAt: null,
    notes: "",
  };
}

/**
 * Pure — mirrors lib/validation/devotee-import.ts/user-import.ts's shape.
 * Unlike those, there's no natural dedup key for a donation (the same donor
 * can legitimately donate the same amount on the same day twice), so there's
 * no "duplicate_in_file"/"duplicate_in_db" status here — only valid/invalid/empty.
 * Linking to an existing devotee by phone (if any) happens at commit time,
 * not here — this function has no DB dependency.
 */
export function validateImportRow(rowNumber: number, raw: RawImportRow): PreviewRow {
  const donorName = cellToString(raw.donorName);
  const donorPhoneRaw = cellToString(raw.donorPhone);
  const donorEmail = cellToString(raw.donorEmail);
  const purpose = cellToString(raw.purpose);
  const notes = cellToString(raw.notes);
  const amountBlank = raw.amount === null || raw.amount === undefined || raw.amount === "";
  const dateBlank = raw.donatedAt === null || raw.donatedAt === undefined || raw.donatedAt === "";
  const methodBlank = !cellToString(raw.paymentMethod);

  if (!donorName && !donorPhoneRaw && !purpose && amountBlank && dateBlank && methodBlank) {
    return { rowNumber, data: emptyData(), normalizedPhone: null, status: "empty", errors: [] };
  }

  const errors: string[] = [];
  if (!donorName) errors.push("Donor name is required");

  let normalizedPhone: string | null = null;
  if (donorPhoneRaw) {
    normalizedPhone = normalizePhoneNumber(donorPhoneRaw, "IN");
    if (!normalizedPhone) errors.push("Invalid phone number");
  }

  const amountResult = parseAmount(raw.amount);
  if (amountResult === "invalid") errors.push("Amount must be a positive number");
  if (amountResult === null) errors.push("Amount is required");
  const amount = amountResult === "invalid" ? null : amountResult;

  if (!purpose) errors.push("Purpose is required");

  const methodResult = parsePaymentMethod(raw.paymentMethod);
  if (methodResult === "invalid") {
    errors.push(`Unknown payment method (expected one of: ${IMPORTABLE_PAYMENT_METHODS.join(", ")})`);
  }
  if (methodResult === null) errors.push("Payment method is required");
  const paymentMethod = methodResult === "invalid" ? null : methodResult;

  const dateResult = parseDateCell(raw.donatedAt);
  if (dateResult === "invalid") errors.push("Invalid date (expected YYYY-MM-DD)");
  if (dateResult === null) errors.push("Date is required");
  const donatedAt = dateResult === "invalid" ? null : dateResult;

  const data: ImportRowData = {
    donorName,
    donorPhone: donorPhoneRaw,
    donorEmail,
    amount,
    purpose,
    paymentMethod,
    donatedAt,
    notes,
  };

  if (errors.length > 0) {
    return { rowNumber, data, normalizedPhone, status: "invalid", errors };
  }
  return { rowNumber, data, normalizedPhone, status: "valid", errors: [] };
}
