import { getPool } from "./pool";
import type { MessageDirection, MessageStatus, WhatsAppMessage } from "@/types/db";

interface WhatsAppMessageRow {
  id: string;
  tenant_id: string;
  devotee_id: string | null;
  direction: MessageDirection;
  from_phone: string;
  to_phone: string;
  body: string;
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
  status: MessageStatus;
  providerMessageId: string | null;
}

export async function logWhatsAppMessage(
  tenantId: string,
  input: LogWhatsAppMessageInput,
): Promise<WhatsAppMessage> {
  const { rows } = await getPool().query<WhatsAppMessageRow>(
    `INSERT INTO whatsapp_messages
       (tenant_id, devotee_id, direction, from_phone, to_phone, body, provider_message_id, status, received_at, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
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
      input.providerMessageId,
      input.status,
    ],
  );
  return mapMessage(rows[0]);
}

export async function listRecentMessages(tenantId: string, limit = 100): Promise<WhatsAppMessage[]> {
  const { rows } = await getPool().query<WhatsAppMessageRow>(
    "SELECT * FROM whatsapp_messages WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2",
    [tenantId, limit],
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
