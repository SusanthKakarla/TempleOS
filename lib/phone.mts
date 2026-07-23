import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.min.json";

const DEFAULT_COUNTRY: CountryCode = "IN";

/** Normalizes a phone number typed by an admin in the dashboard (may be local format). */
export function normalizePhoneNumber(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const parsed = cleaned.startsWith("+")
    ? parsePhoneNumberFromString(cleaned, metadata)
    : parsePhoneNumberFromString(cleaned, defaultCountry, metadata);
  return parsed && parsed.isValid() ? parsed.number : null;
}

/** Normalizes a WhatsApp wa_id, which arrives as a full international number without "+". */
export function normalizeWhatsAppId(waId: string): string {
  const digits = waId.replace(/[^\d]/g, "");
  const withPlus = `+${digits}`;
  const parsed = parsePhoneNumberFromString(withPlus, metadata);
  return parsed && parsed.isValid() ? parsed.number : withPlus;
}

/** Masks all but the first 5 and last 2 digits of the national number (e.g. "98765••••10"), for compact mobile list rows. Ignores a leading country code. */
export function maskPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/[^\d]/g, "");
  const national = digits.length > 10 ? digits.slice(-10) : digits;
  if (national.length < 7) return phone;
  return `${national.slice(0, 5)}••••${national.slice(-2)}`;
}
