-- Activates PhonePe as a second payment provider alongside Razorpay. Reuses
-- the existing tenant_payment_accounts / tenant_payment_credentials tables —
-- PhonePe's Client ID/Client Secret/Webhook Secret map onto the same
-- key_id/encrypted_key_secret/encrypted_webhook_secret columns Razorpay's
-- manual mode already uses (see lib/db/tenant-payment-accounts.ts). Only two
-- genuinely new, non-secret columns are needed: PhonePe requires a Merchant
-- ID (sent as X-MERCHANT-ID on API calls) and a Sandbox/Production
-- environment selection, which Razorpay's key prefix (rzp_test_/rzp_live_)
-- already encodes for free and PhonePe's client id does not.

UPDATE payment_providers SET status = 'active' WHERE key = 'phonepe';

ALTER TABLE donations DROP CONSTRAINT donations_payment_method_check;
ALTER TABLE donations ADD CONSTRAINT donations_payment_method_check
  CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other', 'razorpay', 'phonepe'));

ALTER TABLE tenant_payment_accounts
  ADD COLUMN provider_merchant_id TEXT,
  ADD COLUMN environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox', 'production'));
