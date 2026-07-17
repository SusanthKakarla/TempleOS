-- Seeds one placeholder pilot tenant. The MVP supports exactly one tenant.
-- Real name/address/contact/timezone and the allowlisted admin are set afterward
-- via `npm run seed:admin` (see scripts/seed-admin.ts) once pilot details are known.

INSERT INTO tenants (name, default_contact_phone, address, timezone)
SELECT 'Pilot Temple', NULL, NULL, 'Asia/Kolkata'
WHERE NOT EXISTS (SELECT 1 FROM tenants);
