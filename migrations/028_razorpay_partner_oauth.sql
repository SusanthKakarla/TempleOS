-- Second Razorpay connection method: Partner OAuth (access/refresh token pair)
-- alongside the existing manual Key ID/Key Secret method. Extends the
-- existing tenant_payment_accounts/tenant_payment_credentials tables rather
-- than creating parallel ones — see docs/EL10-PAYMENT-AUDIT-AND-GAP-ANALYSIS.md
-- for why new tables aren't introduced for concepts these already cover.

ALTER TABLE tenant_payment_accounts
  ADD COLUMN connection_method TEXT NOT NULL DEFAULT 'manual' CHECK (connection_method IN ('manual', 'partner')),
  -- Partner mode only — the sub-merchant account id Razorpay assigns on
  -- OAuth connect, used to resolve an incoming partner-webhook event (which
  -- carries account_id, not a tenant id) back to the owning tenant.
  ADD COLUMN razorpay_account_id TEXT UNIQUE,
  -- OAuth connect has no form step to collect this (this app never collects
  -- email at all — phone-OTP auth only) and Razorpay's OAuth token response
  -- doesn't return a merchant email either; nullable for partner mode only.
  ALTER COLUMN contact_email DROP NOT NULL;

ALTER TABLE tenant_payment_credentials
  ALTER COLUMN key_id DROP NOT NULL,
  ALTER COLUMN encrypted_key_secret DROP NOT NULL,
  ADD COLUMN encrypted_access_token TEXT,
  ADD COLUMN encrypted_refresh_token TEXT,
  ADD COLUMN access_token_expires_at TIMESTAMPTZ,
  -- Not a secret — safe to store in plain text, mirrors key_id's own column (never encrypted).
  ADD COLUMN public_token TEXT;

ALTER TABLE tenant_payment_credentials
  ADD CONSTRAINT tenant_payment_credentials_mode_check CHECK (
    (key_id IS NOT NULL AND encrypted_key_secret IS NOT NULL AND encrypted_access_token IS NULL) OR
    (key_id IS NULL AND encrypted_key_secret IS NULL AND encrypted_access_token IS NOT NULL)
  );
