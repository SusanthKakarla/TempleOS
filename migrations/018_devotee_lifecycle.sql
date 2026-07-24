-- Soft-delete for devotees (mirrors tenant_memberships' active/inactive
-- pattern) — replaces the previous hard DELETE, which destroyed the row
-- outright (orphaning notification history via ON DELETE SET NULL) and
-- outright failed with a foreign key violation for any devotee with
-- donation history. Deactivated devotees are excluded from recipient
-- selection and the default list view, but the row and all its history
-- remain fully intact and reachable, and can be reactivated.
ALTER TABLE devotees ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Individual-devotee fields the admin edit form was missing — independent
-- of devotee_families.address (not every devotee belongs to a family).
ALTER TABLE devotees ADD COLUMN address TEXT;
ALTER TABLE devotees ADD COLUMN notes TEXT;
