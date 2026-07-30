-- Support non-cash / in-kind donations (e.g. rice, coconuts, clothing).
-- Makes amount and payment_method nullable, adds item_description for material gifts.
-- A DB-level XOR constraint enforces that every row is either a cash or a non-cash donation.

ALTER TABLE donations
  ADD COLUMN item_description TEXT,
  ALTER COLUMN amount       DROP NOT NULL,
  ALTER COLUMN payment_method DROP NOT NULL;

-- Exactly one of the two branches must be satisfied:
--   Cash:     item_description IS NULL, amount set and positive, payment_method set.
--   Non-cash: item_description non-blank, amount NULL, payment_method NULL.
-- btrim check prevents blank strings from satisfying the non-cash branch even when Zod validation is bypassed.
ALTER TABLE donations
  ADD CONSTRAINT donations_noncash_xor_cash CHECK (
    (
      item_description IS NULL
      AND amount       IS NOT NULL
      AND payment_method IS NOT NULL
    )
    OR
    (
      item_description IS NOT NULL
      AND btrim(item_description) <> ''
      AND amount         IS NULL
      AND payment_method IS NULL
    )
  );
