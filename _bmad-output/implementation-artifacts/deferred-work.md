## Deferred from: code review of 1-1-create-forward-identity-schema (2026-07-18)

- Active auth and seed paths still query removed `admin_users`; user chose to defer because Story 1.1 remains schema-only and auth/seed runtime replacement belongs to Stories 1.2-1.5.

## Deferred from: code review of 1-2-seed-v0-roles-and-first-super-admin (2026-07-18)

- Fallback Postgres user docs may miss schema CREATE privileges in README.md; this is real local setup guidance risk but pre-existing outside the Story 1.2 seed/bootstrap behavior.
