-- Prevents the same phone number, Meta phone number ID, or Meta business
-- account ID from being actively connected to more than one tenant at a
-- time. Indexes are partial (WHERE status = 'connected') rather than plain
-- column-level UNIQUE constraints so that a disconnected temple's old
-- number/WABA remains free to be reassigned to a different temple later.
--
-- meta_phone_number_id previously had a plain UNIQUE constraint (from
-- 001_initial_schema.sql) that blocked reassignment after disconnect; it's
-- replaced here with the same partial-unique pattern for consistency with
-- the two new indexes.

ALTER TABLE whatsapp_accounts DROP CONSTRAINT whatsapp_accounts_meta_phone_number_id_key;

CREATE UNIQUE INDEX whatsapp_accounts_phone_number_connected_key
  ON whatsapp_accounts (phone_number) WHERE status = 'connected';

CREATE UNIQUE INDEX whatsapp_accounts_meta_phone_number_id_connected_key
  ON whatsapp_accounts (meta_phone_number_id) WHERE status = 'connected';

CREATE UNIQUE INDEX whatsapp_accounts_meta_business_account_id_connected_key
  ON whatsapp_accounts (meta_business_account_id) WHERE status = 'connected';
