-- Widens admin_users.role from the single hardcoded 'tenant_admin' value to
-- a proper two-tier role model: 'super_admin' can provision/remove other
-- admins for the tenant, 'admin' has normal dashboard access.

ALTER TABLE admin_users DROP CONSTRAINT admin_users_role_check;

-- Promote any admin seeded under the old single-role model so nothing loses access.
UPDATE admin_users SET role = 'super_admin' WHERE role = 'tenant_admin';

ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('super_admin', 'admin'));

ALTER TABLE admin_users ALTER COLUMN role SET DEFAULT 'admin';
