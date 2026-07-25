interface PermanentErrorInfo {
  category: string;
  description: string;
}

/**
 * Meta error codes that will fail identically no matter how many times we
 * retry — retrying them is pure waste and produces a misleading "Retrying"
 * status that can never resolve to success. Deliberately conservative: only
 * codes we're confident are always-permanent are listed here; anything else
 * (including ambiguous ones like 100 "Invalid parameter") stays on the
 * existing retry path, since skipping a retry that might actually succeed
 * would be worse than one extra futile attempt.
 */
const PERMANENT_WHATSAPP_ERRORS: Record<number, PermanentErrorInfo> = {
  131047: {
    category: "re_engagement",
    description: "Re-engagement message — outside the 24h customer-service window; the window doesn't reopen by waiting.",
  },
  131026: {
    category: "unreachable",
    description: "Message undeliverable — recipient's number isn't reachable on WhatsApp.",
  },
  // Template-specific permanent failures — Meta's own template-validation
  // error codes mean the call itself is malformed/misconfigured, not a
  // transient delivery problem, so retrying changes nothing.
  132000: {
    category: "invalid_payload",
    description: "Template parameter count doesn't match the approved template's component count.",
  },
  132001: {
    category: "template_not_approved",
    description: "Template name/language does not exist or isn't approved for this WhatsApp Business Account.",
  },
  132005: {
    category: "invalid_payload",
    description: "Template hydrated text doesn't match the approved template's content.",
  },
  132012: {
    category: "invalid_payload",
    description: "A template parameter's format doesn't match what the approved template's component expects.",
  },
};

export function isPermanentWhatsAppError(code: number | undefined): boolean {
  return code !== undefined && code in PERMANENT_WHATSAPP_ERRORS;
}

/** Best-effort category for the dashboard's Meta Error column — undefined for anything not in the permanent set (temporary/unclassified failures don't get a category, only a raw code). */
export function classifyWhatsAppError(code: number | undefined): string | undefined {
  return code !== undefined ? PERMANENT_WHATSAPP_ERRORS[code]?.category : undefined;
}
