import type { PoolClient } from "pg";
import { getPool } from "./pool";
import { getTenantDayStartUTC } from "@/lib/whatsapp/templates";
import type {
  ConversationSummary,
  MessageDirection,
  SupportedLanguage,
  WhatsAppStats,
} from "@/types/db";

interface ConversationSummaryRow {
  devotee_id: string;
  display_name: string;
  whatsapp_phone: string;
  is_donor: boolean;
  preferred_language: string | null;
  whatsapp_opt_in_status: boolean;
  last_seen_at: Date;
  last_message_preview: string | null;
  last_message_at: Date | null;
  last_direction: MessageDirection | null;
  unread_count: number;
}

function mapConversationSummary(row: ConversationSummaryRow): ConversationSummary {
  return {
    devoteeId: row.devotee_id,
    displayName: row.display_name,
    whatsappPhone: row.whatsapp_phone,
    isDonor: row.is_donor,
    preferredLanguage: row.preferred_language as SupportedLanguage | null,
    whatsappOptInStatus: row.whatsapp_opt_in_status,
    lastSeenAt: row.last_seen_at.toISOString(),
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at ? row.last_message_at.toISOString() : null,
    lastDirection: row.last_direction,
    unreadCount: row.unread_count,
  };
}

export interface ListConversationsFilter {
  search?: string;
  language?: SupportedLanguage;
  period?: "today" | "week";
  donorsOnly?: boolean;
  optedInOnly?: boolean;
  unreadOnly?: boolean;
}

export async function listConversations(
  tenantId: string,
  filter: ListConversationsFilter = {},
): Promise<ConversationSummary[]> {
  const conditions = ["d.tenant_id = $1", "c.id IS NOT NULL"];
  const params: unknown[] = [tenantId];

  if (filter.search && filter.search.trim()) {
    params.push(`%${filter.search.trim()}%`);
    conditions.push(
      `(d.display_name ILIKE $${params.length} OR d.whatsapp_phone ILIKE $${params.length} OR EXISTS (
         SELECT 1 FROM whatsapp_messages m
         WHERE m.devotee_id = d.id AND m.tenant_id = d.tenant_id AND m.body ILIKE $${params.length}
       ))`,
    );
  }
  if (filter.language) {
    params.push(filter.language);
    conditions.push(`d.preferred_language = $${params.length}`);
  }
  if (filter.period === "today") {
    conditions.push("c.last_message_at >= date_trunc('day', now())");
  } else if (filter.period === "week") {
    conditions.push("c.last_message_at >= now() - interval '7 days'");
  }
  if (filter.donorsOnly) {
    conditions.push("d.is_donor = true");
  }
  if (filter.optedInOnly) {
    conditions.push("d.whatsapp_opt_in_status = true");
  }
  if (filter.unreadOnly) {
    conditions.push("c.unread_count > 0");
  }

  const { rows } = await getPool().query<ConversationSummaryRow>(
    `SELECT d.id AS devotee_id, d.display_name, d.whatsapp_phone, d.is_donor,
            d.preferred_language, d.whatsapp_opt_in_status, d.last_seen_at,
            c.last_message_preview, c.last_message_at, c.last_direction, c.unread_count
     FROM devotees d
     JOIN whatsapp_conversations c ON c.tenant_id = d.tenant_id AND c.devotee_id = d.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.last_message_at DESC NULLS LAST`,
    params,
  );
  return rows.map(mapConversationSummary);
}

export async function getConversationByDevoteeId(
  tenantId: string,
  devoteeId: string,
): Promise<ConversationSummary | null> {
  const { rows } = await getPool().query<ConversationSummaryRow>(
    `SELECT d.id AS devotee_id, d.display_name, d.whatsapp_phone, d.is_donor,
            d.preferred_language, d.whatsapp_opt_in_status, d.last_seen_at,
            c.last_message_preview, c.last_message_at, c.last_direction, c.unread_count
     FROM devotees d
     JOIN whatsapp_conversations c ON c.tenant_id = d.tenant_id AND c.devotee_id = d.id
     WHERE d.tenant_id = $1 AND d.id = $2`,
    [tenantId, devoteeId],
  );
  return rows[0] ? mapConversationSummary(rows[0]) : null;
}

/** No-op if no conversation row exists yet for this devotee (nothing to mark read). */
export async function markConversationRead(tenantId: string, devoteeId: string): Promise<void> {
  await getPool().query(
    `UPDATE whatsapp_conversations SET unread_count = 0, updated_at = now()
     WHERE tenant_id = $1 AND devotee_id = $2`,
    [tenantId, devoteeId],
  );
}

/**
 * Called from inside logWhatsAppMessage's transaction (lib/db/whatsapp-messages.ts)
 * — the single choke point for every send/log path, so every conversation
 * gets its summary row created/touched automatically. unread_count is only
 * ever reset by markConversationRead (an admin opening the thread) — never
 * implicitly here, which is what keeps a conversation "unread" even though
 * the bot's auto-reply logs an outbound message in the same request.
 */
export async function touchConversation(
  client: PoolClient,
  tenantId: string,
  devoteeId: string,
  message: { id: string; direction: MessageDirection; body: string; createdAt: Date },
): Promise<void> {
  await client.query(
    `INSERT INTO whatsapp_conversations
       (tenant_id, devotee_id, last_message_id, last_message_preview, last_message_at, last_direction, unread_count)
     VALUES ($1, $2, $3, left($4, 200), $5, $6, CASE WHEN $6 = 'inbound' THEN 1 ELSE 0 END)
     ON CONFLICT (tenant_id, devotee_id) DO UPDATE SET
       last_message_id = EXCLUDED.last_message_id,
       last_message_preview = EXCLUDED.last_message_preview,
       last_message_at = EXCLUDED.last_message_at,
       last_direction = EXCLUDED.last_direction,
       unread_count = CASE WHEN EXCLUDED.last_direction = 'inbound'
                        THEN whatsapp_conversations.unread_count + 1
                        ELSE whatsapp_conversations.unread_count END,
       updated_at = now()`,
    [tenantId, devoteeId, message.id, message.body, message.createdAt, message.direction],
  );
}

export async function getWhatsAppStats(tenantId: string, timezone: string): Promise<WhatsAppStats> {
  const dayStart = getTenantDayStartUTC(timezone);
  const activeWindowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  const { rows } = await getPool().query<{
    total_conversations: string;
    unread_conversations: string;
    todays_messages: string;
    replies_sent_today: string;
    active_devotees: string;
    new_devotees_from_whatsapp: string;
  }>(
    `SELECT
       (SELECT count(*) FROM whatsapp_conversations WHERE tenant_id = $1) AS total_conversations,
       (SELECT count(*) FROM whatsapp_conversations WHERE tenant_id = $1 AND unread_count > 0) AS unread_conversations,
       (SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND created_at >= $2) AS todays_messages,
       (SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND direction = 'outbound' AND created_at >= $2) AS replies_sent_today,
       (SELECT count(*) FROM devotees WHERE tenant_id = $1 AND last_seen_at >= $3) AS active_devotees,
       (SELECT count(*) FROM devotees WHERE tenant_id = $1 AND whatsapp_opt_in_status = true AND first_seen_at >= $4) AS new_devotees_from_whatsapp`,
    [tenantId, dayStart, activeWindowStart, monthStart],
  );

  const { rows: avgRows } = await getPool().query<{ avg_response_seconds: string | null }>(
    `SELECT extract(epoch FROM avg(reply.created_at - inbound.created_at)) AS avg_response_seconds
     FROM whatsapp_messages inbound
     JOIN LATERAL (
       SELECT created_at FROM whatsapp_messages reply
       WHERE reply.devotee_id = inbound.devotee_id AND reply.direction = 'outbound'
         AND reply.created_at > inbound.created_at
       ORDER BY reply.created_at ASC LIMIT 1
     ) reply ON true
     WHERE inbound.tenant_id = $1 AND inbound.direction = 'inbound' AND inbound.created_at >= $2`,
    [tenantId, dayStart],
  );

  const row = rows[0];
  return {
    totalConversations: Number(row.total_conversations),
    unreadConversations: Number(row.unread_conversations),
    todaysMessages: Number(row.todays_messages),
    repliesSentToday: Number(row.replies_sent_today),
    activeDevotees: Number(row.active_devotees),
    newDevoteesFromWhatsApp: Number(row.new_devotees_from_whatsapp),
    avgBotResponseSeconds: avgRows[0]?.avg_response_seconds != null ? Number(avgRows[0].avg_response_seconds) : null,
  };
}
