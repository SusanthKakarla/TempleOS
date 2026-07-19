-- WhatsApp Conversation Center: per-devotee conversation threading.
-- whatsapp_conversations is a summary/cache table (last message + unread
-- count), not a freestanding entity — every real WhatsApp thread is 1:1
-- with a devotee (devotee_id already is the thread key on whatsapp_messages;
-- no conversation_id column is added there).

-- Genuinely missing from whatsapp_messages: distinguishes what the webhook
-- already differentiates (InboundMessage.type / which client.ts send fn was
-- used) but never persists today. DEFAULT only smooths backfill of existing
-- rows; every new application INSERT passes it explicitly.
ALTER TABLE whatsapp_messages
  ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'button', 'list', 'button_reply', 'list_reply', 'unsupported'));

CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  devotee_id UUID NOT NULL REFERENCES devotees(id) ON DELETE CASCADE,
  last_message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  last_direction TEXT CHECK (last_direction IN ('inbound', 'outbound')),
  unread_count INTEGER NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, devotee_id)
);

CREATE INDEX idx_whatsapp_conversations_tenant_last_message_at
  ON whatsapp_conversations(tenant_id, last_message_at DESC NULLS LAST);

-- Backfill: latest message per devotee becomes the initial summary row.
-- unread_count starts at 0 deliberately — historical data isn't "new,"
-- don't flood admins with false-unread badges on migration day.
INSERT INTO whatsapp_conversations
  (tenant_id, devotee_id, last_message_id, last_message_preview, last_message_at, last_direction, unread_count)
SELECT DISTINCT ON (m.tenant_id, m.devotee_id)
  m.tenant_id, m.devotee_id, m.id, left(m.body, 200), m.created_at, m.direction, 0
FROM whatsapp_messages m
WHERE m.devotee_id IS NOT NULL
ORDER BY m.tenant_id, m.devotee_id, m.created_at DESC
ON CONFLICT (tenant_id, devotee_id) DO NOTHING;

-- Supports the avg-response-time LATERAL join efficiently.
CREATE INDEX idx_whatsapp_messages_devotee_direction_created
  ON whatsapp_messages(devotee_id, direction, created_at);
