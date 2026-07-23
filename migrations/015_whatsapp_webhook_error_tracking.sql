-- Records WHY a webhook subscription attempt failed, instead of only the
-- boolean webhook_subscribed flag. Populated by both connection paths
-- (Super Admin manual connect and tenant-admin Embedded Signup), since both
-- go through the same lib/whatsapp/embedded-signup.ts subscribeWabaWebhooks
-- call and write to the same whatsapp_accounts row. Cleared (set to NULL)
-- whenever a subscribe attempt succeeds.

ALTER TABLE whatsapp_accounts ADD COLUMN webhook_last_error_code TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN webhook_last_error_message TEXT;
