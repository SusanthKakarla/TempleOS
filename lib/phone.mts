import parsePhoneNumberFromString, { type CountryCode } from "libphonenumber-js";

const DEFAULT_COUNTRY: CountryCode = "IN";

/** Normalizes a phone number typed by an admin in the dashboard (may be local format). */
export function normalizePhoneNumber(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const parsed = parsePhoneNumberFromString(cleaned, { defaultCountry });
  return parsed && parsed.isValid() ? parsed.number : null;
}

/** Normalizes a WhatsApp wa_id, which arrives as a full international number without "+". */
export function normalizeWhatsAppId(waId: string): string {
  const digits = waId.replace(/[^\d]/g, "");
  const withPlus = `+${digits}`;
  const parsed = parsePhoneNumberFromString(withPlus);
  return parsed && parsed.isValid() ? parsed.number : withPlus;
}
