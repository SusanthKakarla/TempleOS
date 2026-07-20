-- Adds the fields Meta Embedded Signup gives us beyond the 3 columns the
-- manual/operator-managed flow already writes (phone_number,
-- meta_phone_number_id, meta_business_account_id). No new secret columns:
-- TempleOS acts as a Meta Tech Provider, so a single platform-level System
-- User token (WHATSAPP_ACCESS_TOKEN) calls the Graph API for every
-- connected tenant — nothing per-tenant needs to be stored encrypted here.

ALTER TABLE whatsapp_accounts ADD COLUMN business_name TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN phone_verification_status TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN webhook_subscribed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE whatsapp_accounts ADD COLUMN disconnected_at TIMESTAMPTZ;
