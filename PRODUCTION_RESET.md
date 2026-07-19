# Production Reset Runbook

Use this runbook only when production can be wiped. The current migration chain
is a clean forward-schema install, not an in-place upgrade from the old
`admin_users` production schema.

## Before Reset

1. Freeze production writes.
2. Export a final production database backup.
3. Confirm the deploy target has the current code and required environment
   variables.
4. Confirm Firebase authorized domains include the production super-admin and
   tenant login hosts.

## Reset Database

In the production database console, reset the database or drop all app tables.
Make sure `schema_migrations` is gone too; migrations are skipped by filename
when that table already records them.

## Apply Fresh Schema

Point `DATABASE_URL` at production, then run:

```sh
npm run migrate
```

Fresh migrations intentionally create zero tenants. Do not expect a seeded
placeholder temple.

## Bootstrap Platform Access

Seed roles and the first platform super admin:

```sh
SUPER_ADMIN_PHONE_NUMBER="+91..." \
SUPER_ADMIN_DISPLAY_NAME="Your Name" \
npm run seed
```

`npm run seed` is idempotent. It seeds `role_definitions` and, when the super
admin env vars are present, creates or updates the first row in `super_admins`.

## Create Real Tenant

1. Deploy/start the app.
2. Sign in at `/super-admin/login` with the bootstrapped phone number.
3. Create the first real temple at `/super-admin/temples/new`.
4. Confirm the created tenant has a real `tenant_domains.hostname`.

## Smoke Test

1. `/super-admin` lists only real temples.
2. `/super-admin/temples/[tenantId]` loads for the new temple.
3. Tenant login works from the tenant hostname.
4. Tenant dashboard pages load for a member with the `admin` role.
5. Tenant members without `admin` are blocked from dashboard admin routes.
6. WhatsApp webhook routing still resolves the expected tenant.
