-- "Roles & Permissions" was a User Management sub-feature whose nav link
-- (/dashboard/roles) and management UI were never actually built — removing
-- the dead catalog entry entirely. `tenant_features` rows for it are removed
-- via the existing ON DELETE CASCADE (see migrations/015_feature_access.sql).

DELETE FROM features WHERE key = 'roles_permissions';
