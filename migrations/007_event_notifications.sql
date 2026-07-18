-- Automatic WhatsApp event notifications: queue table + retry state,
-- plus opt-out toggles at tenant (per-notification-type) and devotee level.

ALTER TABLE events DROP CONSTRAINT events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft', 'published', 'cancelled'));

ALTER TABLE tenants
  ADD COLUMN notify_on_new_event BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN notify_on_event_updated BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN notify_on_event_cancelled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE devotees
  ADD COLUMN event_notifications_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  devotee_id UUID NOT NULL REFERENCES devotees(id) ON DELETE CASCADE,
  whatsapp_message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL
    CHECK (notification_type IN ('new_event', 'event_updated', 'event_cancelled')),
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'retrying')),
  attempt_count INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ, -- reserved for a future Meta delivery-receipt webhook; unset in v1
  read_at TIMESTAMPTZ,      -- reserved for future; unset in v1
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_notifications_tenant_id ON event_notifications(tenant_id);
CREATE INDEX idx_event_notifications_event_id ON event_notifications(event_id);
-- Cron sweep's hot path: due rows across ALL tenants, oldest-due first.
CREATE INDEX idx_event_notifications_due ON event_notifications(next_attempt_at)
  WHERE delivery_status IN ('pending', 'retrying');
-- Notification Center recent-list + per-event status surface.
CREATE INDEX idx_event_notifications_tenant_created ON event_notifications(tenant_id, created_at DESC);
