import { getPool } from "./pool";
import { touchConversation } from "./whatsapp-conversations";
import type { MessageDirection, MessageStatus, WhatsAppMessage, WhatsAppMessageType } from "@/types/db";

interface WhatsAppMessageRow {
  id: string;
  tenant_id: string;
  devotee_id: string | null;
  direction: MessageDirection;
  from_phone: string;
  to_phone: string;
  body: string;
  message_type: WhatsAppMessageType;
  provider_message_id: string | null;
  status: MessageStatus;
  received_at: Date | null;
  sent_at: Date | null;
  created_at: Date;
}

function mapMessage(row: WhatsAppMessageRow): WhatsAppMessage {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    devoteeId: row.devotee_id,
    direction: row.direction,
    fromPhone: row.from_phone,
    toPhone: row.to_phone,
    body: row.body,
    messageType: row.message_type,
    providerMessageId: row.provider_message_id,
    status: row.status,
    receivedAt: row.received_at ? row.received_at.toISOString() : null,
    sentAt: row.sent_at ? row.sent_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

export interface LogWhatsAppMessageInput {
  devoteeId: string | null;
  direction: MessageDirection;
  fromPhone: string;
  toPhone: string;
  body: string;
  messageType: WhatsAppMessageType;
  status: MessageStatus;
  providerMessageId: string | null;
}

/**
 * The single choke point for every WhatsApp send/log path (webhook
 * inbound/outbound, announcements, event notifications) — wrapped in a
 * transaction so the conversation summary row (whatsapp_conversations) is
 * always kept in sync with the message log, never a separate step callers
 * could forget.
 */
export async function logWhatsAppMessage(
  tenantId: string,
  input: LogWhatsAppMessageInput,
): Promise<WhatsAppMessage> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<WhatsAppMessageRow>(
      `INSERT INTO whatsapp_messages
         (tenant_id, devotee_id, direction, from_phone, to_phone, body, message_type, provider_message_id, status, received_at, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
         CASE WHEN $3 = 'inbound' THEN now() ELSE NULL END,
         CASE WHEN $3 = 'outbound' THEN now() ELSE NULL END)
       RETURNING *`,
      [
        tenantId,
        input.devoteeId,
        input.direction,
        input.fromPhone,
        input.toPhone,
        input.body,
        input.messageType,
        input.providerMessageId,
        input.status,
      ],
    );
    const message = mapMessage(rows[0]);
    if (message.devoteeId) {
      await touchConversation(client, tenantId, message.devoteeId, {
        id: message.id,
        direction: message.direction,
        body: message.body,
        createdAt: new Date(message.createdAt),
      });
    }
    await client.query("COMMIT");
    return message;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listRecentMessages(tenantId: string, limit = 100): Promise<WhatsAppMessage[]> {
  const { rows } = await getPool().query<WhatsAppMessageRow>(
    "SELECT * FROM whatsapp_messages WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2",
    [tenantId, limit],
  );
  return rows.map(mapMessage);
}

/**
 * Conversation thread history, newest-first from the DB (matches every
 * other list* function's convention) — the client reverses for display and
 * prepends older pages on "Load older messages" without losing scroll
 * position. `before` is an exclusive cursor (oldest currently-loaded
 * message's createdAt), not an offset, so pagination stays correct even as
 * new messages arrive concurrently.
 */
export async function listMessagesForDevotee(
  tenantId: string,
  devoteeId: string,
  opts: { before?: string; limit?: number } = {},
): Promise<WhatsAppMessage[]> {
  const limit = opts.limit ?? 50;
  if (opts.before) {
    const { rows } = await getPool().query<WhatsAppMessageRow>(
      `SELECT * FROM whatsapp_messages
       WHERE tenant_id = $1 AND devotee_id = $2 AND created_at < $3
       ORDER BY created_at DESC LIMIT $4`,
      [tenantId, devoteeId, opts.before, limit],
    );
    return rows.map(mapMessage);
  }
  const { rows } = await getPool().query<WhatsAppMessageRow>(
    `SELECT * FROM whatsapp_messages
     WHERE tenant_id = $1 AND devotee_id = $2
     ORDER BY created_at DESC LIMIT $3`,
    [tenantId, devoteeId, limit],
  );
  return rows.map(mapMessage);
}

/** Single-conversation transcript export — every message, chronological (oldest first), no page cap. */
export async function listAllMessagesForDevotee(tenantId: string, devoteeId: string): Promise<WhatsAppMessage[]> {
  const { rows } = await getPool().query<WhatsAppMessageRow>(
    "SELECT * FROM whatsapp_messages WHERE tenant_id = $1 AND devotee_id = $2 ORDER BY created_at ASC",
    [tenantId, devoteeId],
  );
  return rows.map(mapMessage);
}

export async function countMessagesByDirection(
  tenantId: string,
  direction: MessageDirection,
): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    "SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND direction = $2",
    [tenantId, direction],
  );
  return Number(rows[0].count);
}

export async function countFailedMessages(tenantId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    "SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND status = 'failed'",
    [tenantId],
  );
  return Number(rows[0].count);
}

export interface MessagesPerDayRow {
  date: string;
  inbound: number;
  outbound: number;
}

/** Day-bucketed inbound/outbound message counts for the dashboard trend chart. Read-only aggregation, no new write path. */
export async function getMessagesPerDay(tenantId: string, days = 30): Promise<MessagesPerDayRow[]> {
  const { rows } = await getPool().query<{ day: Date; direction: MessageDirection; count: string }>(
    `SELECT date_trunc('day', created_at) AS day, direction, count(*) AS count
     FROM whatsapp_messages
     WHERE tenant_id = $1 AND created_at >= now() - ($2 || ' days')::interval
     GROUP BY day, direction
     ORDER BY day ASC`,
    [tenantId, days],
  );

  const byDay = new Map<string, MessagesPerDayRow>();
  for (const row of rows) {
    const key = row.day.toISOString();
    const entry = byDay.get(key) ?? { date: key, inbound: 0, outbound: 0 };
    if (row.direction === "inbound") entry.inbound = Number(row.count);
    else entry.outbound = Number(row.count);
    byDay.set(key, entry);
  }
  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}
