-- Fixes a bug surfaced by "Delete All Devotees": that action has always
-- been a soft-delete (migration 018 — is_active = false, history
-- preserved), but the table-level UNIQUE(tenant_id, whatsapp_phone)
-- constraint from migration 001 applies to every row regardless of
-- is_active. Re-importing the same file after "Delete All Devotees" hit
-- two separate problems from this one root cause:
--   1. lib/db/devotees.ts's listExistingPhones (the import duplicate
--      checker) matched deactivated rows too, so every row previewed as
--      "Duplicate (existing)".
--   2. Even past that, committing would still fail with a raw unique-
--      violation, since the deactivated row still physically occupies
--      that (tenant_id, whatsapp_phone) slot.
--
-- Replacing the table constraint with a partial unique index scoped to
-- is_active = true fixes both: multiple inactive rows (and one active
-- row) can now share a phone number, so re-importing a previously
-- deleted-all devotee list creates fresh active rows without collision.
-- (listExistingPhones itself is fixed in the same change, in application
-- code — this migration only changes what the database allows.)
ALTER TABLE devotees DROP CONSTRAINT devotees_tenant_id_whatsapp_phone_key;

CREATE UNIQUE INDEX devotees_tenant_id_whatsapp_phone_active_key
  ON devotees (tenant_id, whatsapp_phone)
  WHERE is_active;
