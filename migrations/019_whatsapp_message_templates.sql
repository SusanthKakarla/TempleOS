-- Meta-approved WhatsApp Message Template registry, per tenant (each temple
-- has its own WABA — meta_business_account_id on whatsapp_accounts — so a
-- template approved for one tenant cannot be sent against another's phone
-- number). Distinct from notification_templates, which is this app's own
-- free-form message-body copy (title/body with {{var}} substitution) — that
-- table is untouched.
CREATE TABLE whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Free text, not enum-constrained: matches an existing NotificationType
  -- value where one exists (e.g. 'user_welcome', 'birthday_devotee'), but
  -- also accepts keys with no current trigger yet (e.g. 'role_assigned') so
  -- registering one ahead of a future trigger needs no migration.
  template_key TEXT NOT NULL,
  meta_template_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  meta_category TEXT NOT NULL DEFAULT 'UTILITY'
    CHECK (meta_category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
  -- Ordered list of named variables (e.g. ["templeName","userName"]) — mapped
  -- to Meta's positional {{1}},{{2}}... params in this order at send time.
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'disabled')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  fallback_strategy TEXT,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, template_key, language)
);

CREATE INDEX idx_whatsapp_message_templates_tenant ON whatsapp_message_templates(tenant_id);

-- Additive delivery-observability columns on notifications — existing
-- columns (delivery_status, attempt_count, failure_reason, etc.) untouched.
ALTER TABLE notifications ADD COLUMN delivery_strategy TEXT
  CHECK (delivery_strategy IN ('free_form', 'template'));
ALTER TABLE notifications ADD COLUMN template_used TEXT;
ALTER TABLE notifications ADD COLUMN conversation_status TEXT
  CHECK (conversation_status IN ('active', 'inactive', 'unknown'));
ALTER TABLE notifications ADD COLUMN meta_error_code INTEGER;
ALTER TABLE notifications ADD COLUMN meta_error_category TEXT;

-- Supports the conversation-window lookup by raw phone number (works for
-- staff too, not just devotees — from_phone isn't devotee-scoped). The
-- existing idx_whatsapp_messages_devotee_direction_created index doesn't
-- cover phone-based lookups.
CREATE INDEX idx_whatsapp_messages_phone_direction
  ON whatsapp_messages(from_phone, direction, created_at DESC);
