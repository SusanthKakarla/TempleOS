-- Public temple website layer.
--
-- One row per tenant holding ONLY website-presentation content. Everything
-- operational the site displays — name, timings, address, contact, story,
-- history, sevas, events, social links, gallery images — already lives in
-- `tenants`, `temple_sevas`, `events`, `temple_social_links` and
-- `notification_media`, and is read from there. Nothing here duplicates it.

CREATE TABLE tenant_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- One website per tenant. The subdomain itself is NOT stored here: it is a
  -- row in tenant_domains (kind = 'website'), so hostname resolution stays in
  -- one table for admin hosts, website hosts, and future custom domains.
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,

  -- Off by default: provisioning a temple must never silently publish a
  -- half-filled public site under its name.
  enabled BOOLEAN NOT NULL DEFAULT false,

  -- Presentation only — same tenant data, different composition.
  hero_template TEXT NOT NULL DEFAULT 'classic'
    CHECK (hero_template IN ('classic', 'heritage', 'divine', 'minimal', 'festival', 'immersive')),
  theme TEXT NOT NULL DEFAULT 'saffron'
    CHECK (theme IN ('saffron', 'maroon', 'gold', 'emerald', 'indigo')),

  -- Website-specific copy. All nullable: a section renders only when the
  -- temple has actually supplied its content (never invented, never
  -- defaulted to another temple's words).
  display_name TEXT,
  deity_name TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  story TEXT,
  about_content TEXT,
  seo_title TEXT,
  seo_description TEXT,

  -- Imagery, referencing the existing tenant-scoped media table rather than
  -- storing copies. ON DELETE SET NULL so removing an image degrades the
  -- website to its fallback instead of breaking the row.
  deity_media_id UUID REFERENCES notification_media(id) ON DELETE SET NULL,
  hero_media_id UUID REFERENCES notification_media(id) ON DELETE SET NULL,
  logo_media_id UUID REFERENCES notification_media(id) ON DELETE SET NULL,
  og_media_id UUID REFERENCES notification_media(id) ON DELETE SET NULL,

  -- Which languages this temple publishes in; reuses the app's existing
  -- en/te support rather than a website-only translation system.
  languages TEXT[] NOT NULL DEFAULT ARRAY['en']::TEXT[]
    CHECK (languages <@ ARRAY['en','te']::TEXT[] AND array_length(languages, 1) >= 1),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_websites_tenant ON tenant_websites(tenant_id);

-- A tenant's public website is a third kind of hostname alongside its admin
-- subdomain ('primary') and any future vanity domain ('custom'), so hostname
-- resolution has exactly one table to consult and a website host can never be
-- mistaken for an admin host.
ALTER TABLE tenant_domains DROP CONSTRAINT IF EXISTS tenant_domains_kind_check;
ALTER TABLE tenant_domains ADD CONSTRAINT tenant_domains_kind_check
  CHECK (kind IN ('primary', 'custom', 'website'));

-- Image categories the public website needs. Extends the existing constraint
-- rather than introducing a second media table.
ALTER TABLE notification_media DROP CONSTRAINT IF EXISTS notification_media_category_check;
ALTER TABLE notification_media ADD CONSTRAINT notification_media_category_check
  CHECK (category IN (
    'event_banner', 'birthday_greeting', 'anniversary_greeting', 'donation_thank_you',
    'festival_greeting', 'campaign_banner',
    'temple_gallery', 'temple_deity', 'temple_hero', 'temple_logo'
  ));
