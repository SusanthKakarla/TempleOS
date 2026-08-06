-- Super Admin "Platform Payment Settings" — generic across every provider (not
-- PhonePe-specific columns), extending the existing catalog table rather than
-- creating a new one. Backs the first UI in this app where a Super Admin can
-- toggle a provider's availability/connection modes without writing SQL.
-- Platform credentials themselves (client id/secret/webhook secret/URLs)
-- remain env-var-only, same as the existing Razorpay Partner OAuth precedent
-- — nothing secret is ever added to this table.

ALTER TABLE payment_providers
  ADD COLUMN manual_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN partner_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN default_connection_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (default_connection_method IN ('manual', 'partner'));
