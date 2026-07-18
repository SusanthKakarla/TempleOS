---
baseline_commit: 16e494cc548a8f05777c0fc23943546e4014c138
---

# Story 1.1: Create Forward Identity Schema

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want the reset schema to include super-admins, persons, tenant memberships, roles, and tenant domains,
so that TempleOS starts from the multi-temple identity model.

## Acceptance Criteria

1. Given a clean database reset is run, when migrations are applied, then the schema includes `super_admins`, `persons`, `tenant_domains`, `role_definitions`, `tenant_memberships`, and `tenant_membership_roles`, and the reset schema does not use `admin_users` as an auth source.
2. Given the identity tables exist, when phone-bearing rows are inserted into `super_admins` or `persons`, then phone numbers are stored in normalized form and uniqueness is enforced for normalized phone numbers where required.
3. Given tenant domains are inserted, when a hostname is stored, then `tenant_domains.hostname` stores the full normalized hostname without scheme, path, query, or port and duplicate hostnames are rejected.
4. Given tenant memberships are inserted, when a person is added to a tenant, then the database prevents duplicate memberships for the same `tenant_id` and `person_id`, and roles are assigned through `tenant_membership_roles`, not columns on `persons`.

## Tasks / Subtasks

- [x] Update the clean-reset schema migration. (AC: 1, 2, 3, 4)
  - [x] Update [migrations/001_initial_schema.sql](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/001_initial_schema.sql) so the reset baseline creates the forward identity tables before dependent tenant-owned tables.
  - [x] Remove `admin_users` from the reset baseline as an auth source.
  - [x] Add `super_admins` with UUID primary key, normalized unique `phone_number`, `display_name`, nullable `firebase_uid`, `active`, and timestamps.
  - [x] Add `persons` with UUID primary key, normalized unique `phone_number`, `display_name`, nullable `firebase_uid`, and timestamps.
  - [x] Add `tenant_domains` with UUID primary key, `tenant_id` FK, normalized unique `hostname`, `kind`, `status`, and timestamps.
  - [x] Add `role_definitions` with UUID primary key, unique `code`, `display_name`, `description`, `capability_set` JSONB, `active`, and timestamps.
  - [x] Add `tenant_memberships` with UUID primary key, `tenant_id`, `person_id`, `display_name`, `status`, timestamps, and `UNIQUE(tenant_id, person_id)`.
  - [x] Add `tenant_membership_roles` as a join table keyed by `(membership_id, role_definition_id)` with `assigned_by_membership_id` and `assigned_at`.

- [x] Repair migration-chain dependencies created by removing `admin_users`. (AC: 1)
  - [x] Update `events.created_by` in [migrations/001_initial_schema.sql](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/001_initial_schema.sql) to reference the forward author model (`tenant_memberships` or `persons`) instead of `admin_users`.
  - [x] Update [migrations/003_admin_roles.sql](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/003_admin_roles.sql) so a clean reset no longer tries to alter `admin_users`.
  - [x] Update `donations.recorded_by` in [migrations/004_donations.sql](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/004_donations.sql) to reference the same forward author model.
  - [x] Keep migration files sorted and runnable through [scripts/migrate.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/migrate.mts), which applies every `migrations/*.sql` file in lexical order.

- [x] Add normalization and schema guardrails. (AC: 2, 3)
  - [x] Reuse [lib/phone.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/phone.mts) for application-side E.164 phone normalization; do not create a second phone parser.
  - [x] Add or name a single hostname-normalization helper for `tenant_domains.hostname`; it must lowercase and reject/strip scheme, path, query, and port before storage.
  - [x] Ensure duplicate normalized `super_admins.phone_number`, duplicate normalized `persons.phone_number`, and duplicate normalized `tenant_domains.hostname` are database-level unique conflicts.

- [x] Update shared type surface only as needed for schema compile safety. (AC: 1, 4)
  - [x] Add forward identity types in [types/db.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/types/db.ts) for `SuperAdmin`, `Person`, `TenantDomain`, `RoleDefinition`, `TenantMembership`, and `TenantMembershipRole`.
  - [x] Keep legacy `AdminUser` changes minimal unless required by compile errors; broader auth replacement belongs to Stories 1.3 through 1.5.

- [x] Add focused tests. (AC: 1, 2, 3, 4)
  - [x] Add a migration/schema test that proves the clean reset SQL contains all six forward identity tables and no `CREATE TABLE admin_users`.
  - [x] Add assertions for `UNIQUE` constraints on `super_admins.phone_number`, `persons.phone_number`, `tenant_domains.hostname`, and `(tenant_id, person_id)`.
  - [x] Add assertions that role assignment is represented by `tenant_membership_roles`, not role columns on `persons`.
  - [x] Add unit coverage for hostname normalization if a helper is introduced.

- [x] Verify implementation. (AC: 1, 2, 3, 4)
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] If a clean local Postgres database is available, run `npm run migrate` against it and confirm every migration applies from zero.

### Review Findings

- [x] [Review][Decision] Active auth and seed paths still query removed `admin_users` table — deferred to Stories 1.2-1.5 by user decision; Story 1.1 remains schema-only. AC1 removes `admin_users` from the clean reset schema, but active runtime paths still call `lib/db/admin-users.ts`, whose queries select, insert, update, and delete `admin_users`. Evidence: `app/api/auth/session/route.ts:3`, `app/api/auth/session/route.ts:32`, `lib/db/admin-users.ts:31`, `lib/db/admin-users.ts:50`, `lib/db/admin-users.ts:70`, `scripts/seed.mts:4`, and `scripts/seed-admin.mts:4`.
- [x] [Review][Patch] Author foreign keys are not tenant-bound [migrations/001_initial_schema.sql:61]
- [x] [Review][Patch] Tenant hostname validation accepts malformed or IP-like domains [lib/tenant-domains.ts:1]
- [x] [Review][Patch] Migration-chain test does not match the real migration runner [migrations/identity-schema.test.ts:11]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` and `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` as controlling artifacts for this slice.
- The older PRD still describes pilot tenant-admin login, but the readiness report says the Super Admin architecture supersedes stale PRD non-goals for this slice. Do not implement Story 1.1 from `templeos-mvp-prd.md` alone.
- Story 1.1 is an architecture-approved exception: it creates the forward identity spine upfront because the database is reset for this slice.

### Current State To Modify

- [migrations/001_initial_schema.sql](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/001_initial_schema.sql) currently creates `admin_users`, then uses it as the auth and author source.
- [migrations/003_admin_roles.sql](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/003_admin_roles.sql) assumes `admin_users` exists and changes its role constraint. If `admin_users` is removed from the reset baseline and this migration is left unchanged, clean migration will fail.
- [migrations/004_donations.sql](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/004_donations.sql) references `admin_users(id)` through `donations.recorded_by`. This must move to the forward author model or the clean migration chain will fail.
- [lib/db/admin-users.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/admin-users.ts), [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts), and [app/api/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts) still use legacy `admin_users`. Story 1.1 should not fully rewrite auth behavior unless needed to keep builds/tests passing; the super-admin and tenant-session behavior is owned by later Epic 1 stories.

### Required Schema Shape

- `super_admins`: platform identity only. It must not depend on `tenants` or tenant memberships.
- `persons`: global human identity keyed by normalized phone. Do not put temple-specific permissions on this table.
- `tenant_domains`: tenant-owned hostnames. Store full normalized hostnames such as `svtemple.trytempleos.com`, not only slugs.
- `role_definitions`: platform-governed catalog. V0 role seeding is Story 1.2, but this table must be ready for role codes and capability JSON.
- `tenant_memberships`: source of tenant login and tenant relationship truth.
- `tenant_membership_roles`: only place where tenant membership roles are assigned. A person may have multiple roles in one tenant and different roles across tenants.

### Non-Goals

- Do not seed V0 roles or first super-admin in this story; that is Story 1.2.
- Do not build super-admin OTP login/session helpers here; that is Story 1.3.
- Do not replace tenant login resolution here; that is Story 1.4.
- Do not implement tenant dashboard role guards here; that is Story 1.5.
- Do not build Super Admin UI, provisioning service, WhatsApp linkage, billing, signup, tenant deletion, impersonation, Meta embedded signup, or tenant picker behavior.

### Architecture Compliance

- AD-1: super-admins are separate from tenant members.
- AD-12: person identity is global; membership and roles are tenant-scoped.
- AD-13: role definitions are platform-governed; assignments are tenant-governed.
- AD-16: clean DB reset starts from the forward schema and does not include `admin_users` as auth source.
- AD-19: tenant domains store full normalized hostnames.

### Library / Framework Requirements

- Use the repo's current stack from `package.json` and `package-lock.json`: Next.js `16.2.10`, React `19.2.4`, TypeScript `5.9.3` lockfile-resolved, `pg` `8.22.0`, Firebase JS SDK `12.16.0`, Firebase Admin SDK `14.2.0`, Zod `4.4.3`, and Vitest `4.1.10`.
- Latest check on 2026-07-18: Next.js `16.2.10`, `pg` `8.22.0`, Firebase JS SDK `12.16.0`, and Vitest `4.1.10` are current stable/latest packages or release notes; do not upgrade to preview/canary/beta packages for this story.
- Use `pg` parameterized queries through repository modules when code is added. Keep raw SQL isolated in migrations and `lib/db/*`.

### Testing Notes

- Existing tests are colocated beside implementation files, for example [lib/auth/session.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.test.ts) and [lib/validation/admins.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/validation/admins.test.ts).
- Vitest runs in Node via [vitest.config.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/vitest.config.ts).
- If a database-backed migration test is too heavy for this story, add static SQL tests that fail on the known hazards: missing forward tables, remaining `CREATE TABLE admin_users`, and FK references to `admin_users`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.1-Create-Forward-Identity-Schema]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#Clean-Start-Baseline]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#Invariants-&-Rules]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#Structural-Seed]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-1---Data-And-Auth-Spine]
- [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-07-18.md#Epic-Quality-Review]
- Latest package checks: Next.js release/package info from `nextjs.org` and `npmjs.com/package/next`; Firebase JS release notes from `firebase.google.com/support/release-notes/js`; `pg` and Vitest package info from `npmjs.com/package/pg` and `npmjs.com/package/vitest`.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- migrations/identity-schema.test.ts lib/tenant-domains.test.ts` failed before implementation, proving missing forward schema and hostname helper.
- `npm run test -- migrations/identity-schema.test.ts lib/tenant-domains.test.ts` passed after implementation.
- `npm run test` passed: 17 files, 129 tests.
- `npm run typecheck` passed after syncing the locally missing declared dependency with `npm i`.
- `npm run lint` passed.
- `npm run migrate` was not run because no clean local Postgres target was identified; validation used static migration tests instead.
- Review fix validation passed: `npm run test` passed 17 files and 131 tests; `npm run typecheck` passed; `npm run lint` passed.

### Implementation Plan

- Replaced the reset baseline identity schema with the forward super-admin/person/domain/role/membership model.
- Kept later auth/session behavior out of scope while removing `admin_users` from the clean migration chain.
- Added DB-level constraints for normalized E.164 phone shape, normalized tenant hostnames, unique identity/domain keys, and duplicate membership prevention.
- Added a single hostname normalization helper and focused Vitest coverage.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Sprint status was not updated because `_bmad-output/implementation-artifacts/sprint-status.yaml` does not exist in this checkout.
- Implemented forward identity reset schema with `super_admins`, `persons`, `tenant_domains`, `role_definitions`, `tenant_memberships`, and `tenant_membership_roles`.
- Removed clean migration-chain dependencies on `admin_users`; `events.created_by` and `donations.recorded_by` now reference `tenant_memberships`.
- Added hostname normalization helper plus static schema tests covering AC1-AC4.
- Verified with `npm run test`, `npm run typecheck`, and `npm run lint`.
- Resolved review patches by tenant-binding `events.created_by` and `donations.recorded_by`, hardening hostname validation against malformed/IP-like domains, and making the migration-chain test read every sorted `.sql` migration like `scripts/migrate.mts`.
- Deferred the active `admin_users` auth/seed runtime replacement to Stories 1.2-1.5 by user decision.

### File List

- `_bmad-output/implementation-artifacts/1-1-create-forward-identity-schema.md`
- `migrations/001_initial_schema.sql`
- `migrations/003_admin_roles.sql`
- `migrations/004_donations.sql`
- `migrations/identity-schema.test.ts`
- `lib/tenant-domains.ts`
- `lib/tenant-domains.test.ts`
- `types/db.ts`
- `_bmad-output/implementation-artifacts/deferred-work.md`

## Change Log

- 2026-07-18: Implemented Story 1.1 forward identity schema, normalization guardrails, tests, and story status update to review.
- 2026-07-18: Applied code review patches, deferred auth/seed runtime replacement to later Epic 1 stories, and updated story status to done.
