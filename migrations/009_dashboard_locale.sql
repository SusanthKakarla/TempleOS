-- Tenant admin dashboard UI language preference (English/Telugu), independent
-- from devotees.preferred_language (WhatsApp bot). Null means "no preference
-- saved yet" -- the app falls back to a cookie/browser default, not a DB default.

ALTER TABLE tenant_memberships ADD COLUMN preferred_ui_language TEXT
  CHECK (preferred_ui_language IN ('en', 'te'));
