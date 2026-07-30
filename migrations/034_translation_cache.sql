-- Global (not per-tenant) cache of English->Telugu machine translations,
-- backing the dynamic translation engine (lib/i18n/translate.ts) that
-- powers the tenant dashboard's Telugu display of free-text database
-- content (devotee names, event/campaign copy, seva names, etc.). Global
-- because translating a given English string ("Farmer", "Annadanam") to
-- Telugu produces the same result regardless of which temple owns the
-- record — scoping by tenant would multiply Google Translate API cost with
-- no benefit. English->Telugu only (a deliberate product decision, see
-- lib/i18n/translate.ts) — no source_locale column needed since the
-- direction is fixed; target_locale is still a real column (not hardcoded
-- away) so a future additional direction only needs the CHECK relaxed, not
-- a destructive migration.
CREATE TABLE translation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- sha256 of the exact source text, not the text itself, as the lookup
  -- key — source strings can be arbitrarily long (event descriptions), and
  -- hashing keeps the unique index small and fixed-width regardless of
  -- input length.
  source_hash TEXT NOT NULL,
  target_locale TEXT NOT NULL DEFAULT 'te' CHECK (target_locale = 'te'),
  -- Kept alongside the hash (not just the hash) for debuggability — a
  -- future cache-inspection admin tool doesn't need to reverse a hash.
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_hash, target_locale)
);

CREATE INDEX idx_translation_cache_lookup ON translation_cache(source_hash, target_locale);
