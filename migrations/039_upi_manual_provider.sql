-- V0: manual UPI deep-link donations, replacing the gateway dependency.
-- Adds a new "upi_manual" provider that deliberately has no adapter — a
-- temple stores its own UPI VPA/payee name/QR, the public donation page
-- builds a standard upi://pay link client-side, and the resulting donation
-- sits in `pending_verification` until a temple admin manually approves it.
-- Razorpay/PhonePe code paths are left completely untouched; only their
-- platform-wide catalog `status` flips to 'coming_soon' below, which is the
-- single, fully reversible V0 "disable" switch.

ALTER TABLE tenant_payment_accounts
  ADD COLUMN upi_vpa TEXT,
  ADD COLUMN payee_name TEXT,
  ADD COLUMN qr_code_url TEXT,
  ADD COLUMN bank_label TEXT,
  ADD COLUMN default_donation_note TEXT;

ALTER TABLE payment_transactions
  ADD COLUMN upi_reference TEXT,
  ADD COLUMN payment_screenshot_url TEXT;

ALTER TABLE payment_transactions DROP CONSTRAINT payment_transactions_status_check;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_status_check
  CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded', 'pending_verification'));

ALTER TABLE donations DROP CONSTRAINT donations_payment_method_check;
ALTER TABLE donations ADD CONSTRAINT donations_payment_method_check
  CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other', 'razorpay', 'phonepe', 'upi_manual'));

INSERT INTO payment_providers (key, label, status, manual_enabled, partner_enabled, default_connection_method) VALUES
  ('upi_manual', 'UPI (Direct)', 'active', true, false, 'manual');

-- V0 product decision: TempleOS does not process payments directly. This is
-- a data-only, fully reversible toggle — flip back to 'active' to bring
-- Razorpay/PhonePe checkout back for every already-connected tenant with
-- zero code changes.
UPDATE payment_providers SET status = 'coming_soon' WHERE key IN ('razorpay', 'phonepe');
