/**
 * Meta error codes that will fail identically no matter how many times we
 * retry — retrying them is pure waste and produces a misleading "Retrying"
 * status that can never resolve to success. Deliberately conservative: only
 * codes we're confident are always-permanent are listed here; anything else
 * (including ambiguous ones like 100 "Invalid parameter") stays on the
 * existing retry path, since skipping a retry that might actually succeed
 * would be worse than one extra futile attempt.
 */
const PERMANENT_WHATSAPP_ERROR_CODES = new Set([
  131047, // Re-engagement message — outside the 24h customer-service window; the window doesn't reopen by waiting
  131026, // Message undeliverable — recipient's number isn't reachable on WhatsApp
]);

export function isPermanentWhatsAppError(code: number | undefined): boolean {
  return code !== undefined && PERMANENT_WHATSAPP_ERROR_CODES.has(code);
}
