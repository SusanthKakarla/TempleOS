import { getPool } from "@/lib/db/pool";
import { normalizeWhatsAppId } from "@/lib/phone.mts";

const CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ConversationStatus = "active" | "inactive" | "unknown";

/**
 * Whether Meta's 24h customer-service window is open for this phone number —
 * i.e. whether a free-form message can legally be sent, or a Message
 * Template is required. Works for staff and devotees alike:
 * whatsapp_messages.from_phone is a raw phone string, not devotee-scoped, so
 * this isn't limited to recipients who happen to have a devotee record.
 *
 * "unknown" is distinct from "inactive" — it means the check itself
 * couldn't run (bad input, DB error), not that we positively determined the
 * window is closed. Callers should treat "unknown" conservatively (same as
 * "inactive": don't risk a free-form send Meta will reject).
 */
export async function resolveConversationStatus(tenantId: string, phone: string): Promise<ConversationStatus> {
  if (!tenantId || !phone) return "unknown";

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizeWhatsAppId(phone);
  } catch {
    return "unknown";
  }

  try {
    const { rows } = await getPool().query<{ created_at: Date }>(
      `SELECT created_at FROM whatsapp_messages
       WHERE tenant_id = $1 AND from_phone = $2 AND direction = 'inbound'
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, normalizedPhone],
    );
    if (rows.length === 0) return "inactive";
    return Date.now() - rows[0].created_at.getTime() < CONVERSATION_WINDOW_MS ? "active" : "inactive";
  } catch {
    return "unknown";
  }
}
