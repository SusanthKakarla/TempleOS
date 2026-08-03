-- Temple records are kept per person, not per phone number: family members
-- routinely share one mobile number, and phone number is contact info only
-- — never an identity/dedup key. Removes the last remaining uniqueness
-- constraint on devotees.whatsapp_phone (migration 035's partial unique
-- index, itself a replacement for migration 001's original table-wide
-- UNIQUE(tenant_id, whatsapp_phone)) so any number of devotees may share a
-- phone number, with no special-casing required.
DROP INDEX devotees_tenant_id_whatsapp_phone_active_key;
