-- WhatsApp Chatbot Settings (Milestone 1): CMS content the dashboard controls
-- and the WhatsApp bot reads at request time. No booking flow, no payment
-- integration, no multilingual support yet — those are later milestones.

ALTER TABLE tenants
  ADD COLUMN welcome_message TEXT,
  ADD COLUMN description TEXT,
  ADD COLUMN history TEXT,
  ADD COLUMN contact_email TEXT,
  ADD COLUMN google_maps_link TEXT,
  ADD COLUMN morning_open TIME,
  ADD COLUMN morning_close TIME,
  ADD COLUMN evening_open TIME,
  ADD COLUMN evening_close TIME;
-- default_contact_phone and address already exist on tenants — not duplicated.

CREATE TABLE temple_special_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  occasion TEXT NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  morning_open TIME,
  morning_close TIME,
  evening_open TIME,
  evening_close TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, date)
);
CREATE INDEX idx_temple_special_days_tenant_date ON temple_special_days(tenant_id, date);

CREATE TABLE temple_sevas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) CHECK (price IS NULL OR price >= 0),
  duration TEXT,
  available_days TEXT[] NOT NULL DEFAULT '{}'
    CHECK (available_days <@ ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::TEXT[]),
  booking_enabled BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_temple_sevas_tenant_order ON temple_sevas(tenant_id, display_order);

CREATE TABLE temple_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_temple_faqs_tenant_order ON temple_faqs(tenant_id, display_order);

CREATE TABLE temple_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','youtube','twitter','website','other')),
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, platform)
);

-- Extend the existing plain TEXT+CHECK "enum" with the four new chatbot
-- commands introduced in this milestone.
ALTER TABLE whatsapp_interactions DROP CONSTRAINT whatsapp_interactions_interaction_type_check;
ALTER TABLE whatsapp_interactions ADD CONSTRAINT whatsapp_interactions_interaction_type_check
  CHECK (interaction_type IN ('menu','viewed_events','requested_contact','unknown',
                               'viewed_timings','viewed_history','viewed_sevas','viewed_faq'));
