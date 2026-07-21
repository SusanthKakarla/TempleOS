-- Generalized notification engine: reusable queue/template/preferences tables
-- for automated notifications (birthdays, new-user welcome, devotee
-- registration, event reminders) beyond the existing event-only pipeline.
-- event_notifications is left completely untouched.

ALTER TABLE audit_log DROP CONSTRAINT audit_log_actor_type_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_actor_type_check
  CHECK (actor_type IN ('super_admin', 'tenant_member', 'system'));

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'whatsapp')),
  language TEXT NOT NULL CHECK (language IN ('en', 'te')),
  title TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notification_type, channel, language)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
  recipient_devotee_id UUID REFERENCES devotees(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'whatsapp')),
  category TEXT NOT NULL,
  title TEXT,
  message TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'te')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'retrying')),
  attempt_count INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(recipient_person_id, recipient_devotee_id) = 1)
);

CREATE INDEX idx_notifications_due ON notifications (next_attempt_at)
  WHERE delivery_status IN ('pending', 'retrying');
CREATE INDEX idx_notifications_recipient_person ON notifications (tenant_id, recipient_person_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_devotee ON notifications (tenant_id, recipient_devotee_id, created_at DESC);
CREATE INDEX idx_notifications_tenant_created ON notifications (tenant_id, created_at DESC);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, notification_type)
);
