-- Move Firebase auth binding onto the global person identity.
-- Super admins remain a separate platform authorization table.

ALTER TABLE super_admins
  ADD COLUMN person_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM super_admins sa
    JOIN persons p ON p.phone_number = sa.phone_number
    WHERE sa.firebase_uid IS NOT NULL
      AND p.firebase_uid IS NOT NULL
      AND sa.firebase_uid <> p.firebase_uid
  ) THEN
    RAISE EXCEPTION 'Cannot unify super-admin identity: conflicting Firebase UID for matching phone number';
  END IF;
END $$;

INSERT INTO persons (phone_number, display_name, firebase_uid)
SELECT sa.phone_number, sa.display_name, sa.firebase_uid
FROM super_admins sa
WHERE NOT EXISTS (
  SELECT 1
  FROM persons p
  WHERE p.phone_number = sa.phone_number
);

UPDATE persons p
SET firebase_uid = sa.firebase_uid,
    updated_at = now()
FROM super_admins sa
WHERE p.phone_number = sa.phone_number
  AND p.firebase_uid IS NULL
  AND sa.firebase_uid IS NOT NULL;

UPDATE super_admins sa
SET person_id = p.id,
    updated_at = now()
FROM persons p
WHERE p.phone_number = sa.phone_number
  AND sa.person_id IS NULL;

ALTER TABLE super_admins
  ALTER COLUMN person_id SET NOT NULL;

ALTER TABLE super_admins
  ADD CONSTRAINT super_admins_person_id_unique UNIQUE (person_id);

ALTER TABLE super_admins
  ADD CONSTRAINT super_admins_person_id_fkey FOREIGN KEY (person_id) REFERENCES persons(id);

ALTER TABLE super_admins
  DROP COLUMN firebase_uid;
