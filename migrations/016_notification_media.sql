-- Media attachments for WhatsApp notifications (event banners, reusable
-- greeting images, festival banners). notification_templates stays untouched
-- because it is a platform-global table (no tenant_id) — per-tenant image
-- selection is resolved through tenant_notification_media instead.

CREATE TABLE notification_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN
    ('event_banner', 'birthday_greeting', 'anniversary_greeting', 'donation_thank_you', 'festival_greeting')),
  title TEXT,
  storage_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INT,
  height INT,
  file_size INT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_by, tenant_id) REFERENCES tenant_memberships(id, tenant_id) ON DELETE SET NULL
);
CREATE INDEX idx_notification_media_tenant_category ON notification_media(tenant_id, category);

-- Resolves which reusable image (if any) a tenant has attached to an
-- automated notification type (birthday_devotee, anniversary_devotee,
-- donation_thank_you). Not used for event banners (per-event, see
-- events.banner_media_id) or festival greetings (sent by explicit media id).
CREATE TABLE tenant_notification_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  media_id UUID NOT NULL REFERENCES notification_media(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, notification_type)
);

ALTER TABLE events ADD COLUMN banner_media_id UUID REFERENCES notification_media(id) ON DELETE SET NULL;

-- Frozen at enqueue time (same as title/message already are) so delivery
-- never has to re-resolve a tenant's current banner mid-retry.
ALTER TABLE notifications ADD COLUMN media_id UUID REFERENCES notification_media(id) ON DELETE SET NULL;
