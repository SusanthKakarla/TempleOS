-- Seeds one placeholder pilot tenant for legacy/local demo data.
-- Platform super-admin bootstrap is handled separately through `npm run seed`
-- and `npm run seed:super-admin`; this pilot seed is not a production
-- super-admin provisioning path.

INSERT INTO tenants (name, default_contact_phone, address, timezone)
SELECT 'Pilot Temple', NULL, NULL, 'Asia/Kolkata'
WHERE NOT EXISTS (SELECT 1 FROM tenants);
