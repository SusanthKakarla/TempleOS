-- Multi-tenant payment provider framework (Razorpay V1). Every temple
-- connects its OWN payment account — there is no platform-level payment
-- credential anywhere (unlike WhatsApp's single shared System User token).
-- Schema follows the `features`/`tenant_features` catalog+per-tenant-row
-- precedent (migration 015) and the `whatsapp_accounts` one-row-per-tenant
-- precedent (migration 001/014), not a new pattern.

CREATE TABLE payment_providers (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('active', 'coming_soon'))
);

INSERT INTO payment_providers (key, label, status) VALUES
  ('razorpay', 'Razorpay', 'active'),
  ('stripe', 'Stripe', 'coming_soon'),
  ('cashfree', 'Cashfree', 'coming_soon'),
  ('phonepe', 'PhonePe', 'coming_soon'),
  ('payu', 'PayU', 'coming_soon');

-- One row per tenant-provider connection. `is_active` marks which single
-- connection donation checkout actually uses today (schema allows a tenant
-- to have connected more than one provider historically without ambiguity).
CREATE TABLE tenant_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL REFERENCES payment_providers(key),
  business_name TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disabled')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  last_validation_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_key)
);
CREATE INDEX idx_tenant_payment_accounts_tenant ON tenant_payment_accounts(tenant_id);
-- At most one active connection per tenant — donation checkout always has a
-- single unambiguous provider to use.
CREATE UNIQUE INDEX idx_tenant_payment_accounts_one_active
  ON tenant_payment_accounts(tenant_id) WHERE is_active;

-- Secrets live in their own table so a routine "list connected providers"
-- query never has to be careful about accidentally SELECT * over a secret
-- column — the credentials table is a separate, narrowly-queried surface.
CREATE TABLE tenant_payment_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_account_id UUID NOT NULL UNIQUE REFERENCES tenant_payment_accounts(id) ON DELETE CASCADE,
  key_id TEXT NOT NULL,
  encrypted_key_secret TEXT NOT NULL,
  encrypted_webhook_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The order/payment lifecycle AND the campaign->donation link in one row —
-- no separate "Campaign Payment Mapping" table; this row already links
-- campaign_id to the donation_id it produced.
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_account_id UUID NOT NULL REFERENCES tenant_payment_accounts(id),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,
  provider_key TEXT NOT NULL REFERENCES payment_providers(key),
  provider_order_id TEXT NOT NULL,
  provider_payment_id TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
  donor_name TEXT NOT NULL,
  donor_phone TEXT,
  donor_email TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  receipt_number TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payment_account_id, provider_order_id)
);
CREATE INDEX idx_payment_transactions_tenant_created ON payment_transactions(tenant_id, created_at DESC);
CREATE INDEX idx_payment_transactions_campaign ON payment_transactions(campaign_id) WHERE campaign_id IS NOT NULL;

-- Raw operational/security audit trail for every inbound webhook hit,
-- regardless of whether it maps to a known transaction — the class of gap
-- the existing WhatsApp webhook has (no logging, no signature check at all).
CREATE TABLE payment_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  provider_key TEXT NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  event_type TEXT,
  raw_body TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_webhook_logs_tenant_created ON payment_webhook_logs(tenant_id, created_at DESC);

-- Campaign donation-link addressing: a slug (mirrors tenants.slug) and an
-- unguessable, stable-per-campaign token (many donors reuse the same link —
-- not a single-use capability token) so /donate/{tenantSlug}/{campaignSlug}/{token}
-- can't be enumerated by walking sequential ids or titles.
ALTER TABLE campaigns
  ADD COLUMN slug TEXT,
  ADD COLUMN donation_token TEXT;

UPDATE campaigns
SET slug = left(
      COALESCE(NULLIF(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), ''), 'campaign'),
      54
    ) || '-' || substr(id::text, 1, 8),
    donation_token = encode(gen_random_bytes(16), 'base64')
WHERE slug IS NULL;

ALTER TABLE campaigns
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN donation_token SET NOT NULL,
  ADD CONSTRAINT campaigns_slug_unique UNIQUE (slug),
  ADD CONSTRAINT campaigns_donation_token_unique UNIQUE (donation_token);

-- One new payment method value, via the same drop/recreate-constraint
-- pattern already used for notification_media.category and campaigns_check.
ALTER TABLE donations DROP CONSTRAINT donations_payment_method_check;
ALTER TABLE donations ADD CONSTRAINT donations_payment_method_check
  CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other', 'razorpay'));
