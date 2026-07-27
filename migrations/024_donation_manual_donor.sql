-- Lets a donation be recorded without a registered devotee (walk-ins, visitors,
-- anonymous/corporate/NRI donors) — never auto-creates a devotee. Exactly one
-- of devotee_id / manual_donor_name is set per row, enforced at the DB level.
ALTER TABLE donations
  ALTER COLUMN devotee_id DROP NOT NULL,
  ADD COLUMN manual_donor_name TEXT,
  ADD COLUMN manual_donor_phone TEXT,
  ADD COLUMN manual_donor_email TEXT,
  ADD COLUMN manual_donor_address TEXT,
  ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE donations
  ADD CONSTRAINT donations_donor_source_check CHECK (
    (devotee_id IS NOT NULL AND manual_donor_name IS NULL) OR
    (devotee_id IS NULL AND manual_donor_name IS NOT NULL)
  );
