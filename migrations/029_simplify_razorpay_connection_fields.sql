-- Razorpay connection is simplified down to Key ID / Key Secret / Webhook
-- Secret / connection status only — Business Name, Merchant Name, Contact
-- Email, and Contact Phone were purely descriptive metadata never used by
-- checkout, webhooks, refunds, or reconciliation, and are no longer
-- collected anywhere (manual connect form, Partner OAuth callback, or the
-- Super Admin provisioning wizard).

ALTER TABLE tenant_payment_accounts
  DROP COLUMN business_name,
  DROP COLUMN merchant_name,
  DROP COLUMN contact_email,
  DROP COLUMN contact_phone;
