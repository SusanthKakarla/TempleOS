---
baseline_commit: 16e494cc548a8f05777c0fc23943546e4014c138
story_generation_note: "Inferred as next sequential story because _bmad-output/implementation-artifacts/sprint-status.yaml does not exist."
---

# Story 1.2: Seed V0 Roles And First Super Admin

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want fixed V0 role definitions and an explicit first-super-admin seed command,
so that privileged access is bootstrapped without tenant-admin shortcuts.

## Acceptance Criteria

1. Given role seed runs on a clean database, when the seed completes, then `role_definitions` contains active role codes `admin`, `priest`, `committee_member`, `volunteer`, and `devotee`, and each role has the V0 capability meaning defined by the architecture.
2. Given the first-super-admin seed command is run with a phone number and display name, when no matching super-admin exists, then an active `super_admins` row is created, and the command does not create a tenant membership for that super-admin.
3. Given the first-super-admin seed command is run for an existing normalized phone number, when the row already exists, then the command updates only intended seed-safe fields or exits idempotently, and it does not create duplicate super-admin rows.
4. Given legacy pilot seed scripts still exist for local demo data, when production super-admin bootstrap is needed, then the documented command targets `super_admins`, and it does not rely on `getPilotTenant()`.

## Tasks / Subtasks

- [x] Add the role-definition seed path. (AC: 1)
  - [x] Create a focused repository module such as [lib/db/role-definitions.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/role-definitions.ts) for platform-governed role catalog reads/writes.
  - [x] Seed exactly these active role codes: `admin`, `priest`, `committee_member`, `volunteer`, and `devotee`.
  - [x] Store capability meanings in `capability_set` JSONB; do not add role columns to `persons` or `tenant_memberships`.
  - [x] Make the seed idempotent with `ON CONFLICT (code)` updating only seed-safe fields such as display name, description, capability set, active state, and `updated_at`.

- [x] Add the first-super-admin bootstrap path. (AC: 2, 3, 4)
  - [x] Create a focused repository module such as [lib/db/super-admins.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/super-admins.ts) for `super_admins`.
  - [x] Add an upsert helper keyed by normalized `phone_number` that creates an active row and updates only intended seed-safe fields on repeat runs.
  - [x] Reuse [lib/phone.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/phone.mts) for phone normalization; do not introduce a second parser or regex-only normalizer.
  - [x] Ensure this bootstrap does not create `persons`, `tenant_memberships`, or `tenant_membership_roles`.

- [x] Replace the production bootstrap script surface. (AC: 2, 3, 4)
  - [x] Add [scripts/seed-super-admin.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/seed-super-admin.mts) as the explicit first-super-admin command.
  - [x] Add `seed:super-admin` to [package.json](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/package.json).
  - [x] Accept `--phone` and `--name` arguments, with environment fallbacks only if the existing seed workflow needs them.
  - [x] Produce clear non-zero exits for missing or invalid phone input, without printing secrets.
  - [x] Update [scripts/seed.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/seed.mts) to run the role seed and optional first-super-admin bootstrap against `role_definitions` and `super_admins`, not `admin_users`.
  - [x] Either retire [scripts/seed-admin.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/seed-admin.mts) from production docs or narrow it clearly to legacy/local demo behavior; production bootstrap must point to `seed:super-admin`.

- [x] Remove the Story 1.2 `getPilotTenant()` footgun from production bootstrap. (AC: 4)
  - [x] Ensure [scripts/seed-super-admin.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/seed-super-admin.mts) does not import or call `getPilotTenant()`.
  - [x] Ensure [scripts/seed.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/seed.mts), if kept as the deploy-time bootstrap, no longer requires a pilot tenant before creating platform role definitions or a super admin.
  - [x] Do not touch [scripts/seed-whatsapp-account.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/seed-whatsapp-account.mts) unless tests require isolating legacy pilot-only scripts; WhatsApp provisioning is not Story 1.2.

- [x] Add focused tests. (AC: 1, 2, 3, 4)
  - [x] Add unit/static tests proving the V0 role seed contains exactly the required role codes and capability meanings.
  - [x] Add tests proving first-super-admin upsert normalizes phone numbers, creates an active `super_admins` row, and is idempotent.
  - [x] Add a regression test proving Story 1.2 production bootstrap paths do not reference `admin_users` or `getPilotTenant()`.
  - [x] Keep tests compatible with Vitest's Node environment in [vitest.config.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/vitest.config.ts); static SQL/script tests are acceptable if no local Postgres target is available.

- [x] Verify implementation. (AC: 1, 2, 3, 4)
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.
  - [x] If a clean local Postgres database is available, run `npm run migrate` and `npm run seed:super-admin -- --phone <test-phone> --name <test-name>` against it.

### Review Findings

- [x] [Review][Patch] First-super-admin bootstrap allows multiple first super admins [lib/db/super-admins.ts:37]
- [x] [Review][Patch] V0 role seed leaves extra active role definitions in place [lib/db/role-definitions.ts:113]
- [x] [Review][Patch] V0 role seed is not transactional [lib/db/role-definitions.ts:113]
- [x] [Review][Defer] Fallback Postgres user docs may miss schema CREATE privileges [README.md:107] — deferred, pre-existing

## Dev Notes

### Controlling Context

- Use [_bmad-output/planning-artifacts/epics.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/epics.md) and [_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md) as controlling sources for Story 1.2.
- The older PRD says "Super Admin dashboard" is out of scope for the original pilot MVP. For this slice, the Super Admin architecture supersedes that stale PRD guidance.
- Story 1.1 is complete and intentionally deferred active auth/seed runtime replacement to Stories 1.2-1.5. Story 1.2 owns the bootstrap piece of that deferred work.

### Current State To Modify

- [migrations/001_initial_schema.sql](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/001_initial_schema.sql) already creates `super_admins` and `role_definitions`.
- [types/db.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/types/db.ts) already includes `SuperAdmin`, `RoleCode`, and `RoleDefinition` types from Story 1.1. Prefer extending these types over duplicating local type aliases.
- [lib/phone.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/phone.mts) already normalizes admin-entered phone numbers with `libphonenumber-js`; use it before writing `super_admins.phone_number`.
- [scripts/load-env.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/load-env.mts) exists and should be imported by new CLI scripts that need environment variables.
- [scripts/seed.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/seed.mts) currently imports `getPilotTenant()` and `upsertAdminUser()` and writes `admin_users`. This will fail against the forward reset schema and must be replaced for production bootstrap.
- [scripts/seed-admin.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/seed-admin.mts) currently imports `getPilotTenant()`, `updateTenant()`, and `upsertAdminUser()` and accepts `--role super_admin|admin`. Do not use this as the production super-admin bootstrap path.
- [lib/db/admin-users.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/admin-users.ts) still queries `admin_users`. Story 1.2 should not rewrite tenant dashboard auth wholesale; Story 1.3 through Story 1.5 own session replacement. Only avoid using `admin-users.ts` from the new seed paths.

### Required V0 Role Meanings

- `admin`: dashboard access plus tenant member and role management inside the tenant.
- `priest`: identity marker only in V0; no extra dashboard permission by itself.
- `committee_member`: identity marker only in V0; no extra dashboard permission by itself.
- `volunteer`: identity marker only in V0; no extra dashboard permission by itself.
- `devotee`: tenant relationship marker; not automatic dashboard login permission.

### Architecture Compliance

- AD-1: super-admins are separate from tenant members. The first-super-admin seed must not create a tenant membership.
- AD-4: pilot-only lookup must not provision production tenants. New production bootstrap must not call `getPilotTenant()`.
- AD-8: super-admin identity is phone OTP with no V0 super-admin role hierarchy. V0 super admins are all equal.
- AD-13: role definitions are platform-governed; assignments are tenant-governed. This story seeds definitions only, not tenant assignments.
- AD-18: V0 role seeds and capabilities are fixed. Seed exactly the five accepted active roles and no tenant-local custom roles.

### Non-Goals

- Do not implement super-admin OTP login, session cookies, or `requireSuperAdmin()`; that is Story 1.3.
- Do not implement tenant subdomain login or tenant membership session creation; that is Story 1.4.
- Do not enforce dashboard role guards; that is Story 1.5.
- Do not create tenant provisioning DTOs, `provisionTemple`, Super Admin UI, or provisioning APIs; those are Epic 2 and Epic 3.
- Do not assign the first super admin to a temple, create a `person` for the super admin, or add `tenant_membership_roles`.
- Do not add public signup, billing, approval queues, tenant deletion, impersonation, Meta embedded signup, or WhatsApp self-serve connection UI.

### Library / Framework Requirements

- Use the repo's current stack from [package.json](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/package.json): Next.js `16.2.10`, React `19.2.4`, `pg` `^8.22.0`, Firebase JS SDK `^12.16.0`, Firebase Admin SDK `^14.2.0`, Zod `^4.4.3`, TypeScript `^5`, and Vitest `^4.1.10`.
- Latest check on 2026-07-18: npm lists Next.js `16.2.10`, `pg` `8.22.0`, and Vitest `4.1.10` as the latest stable tags; Firebase JS release notes list `12.16.0` as released on 2026-07-09. Do not upgrade to Next canary/preview or Vitest beta for this story.
- Use `pg` parameterized queries through `lib/db/*` repository modules. Keep raw SQL isolated in migrations/tests and data-access helpers.

### Testing Notes

- Existing static migration guardrails live in [migrations/identity-schema.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/identity-schema.test.ts).
- Existing phone normalization tests live in [lib/phone.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/phone.test.ts).
- Prefer small repository tests with mocked `getPool().query` or static script tests over requiring a live Postgres database unless the repo already has a test DB helper when implementation starts.
- Regression assertions should catch both `admin_users` and `getPilotTenant()` in new production seed paths; the known legacy/local files can be explicitly excluded if they remain intentionally deferred.

### Previous Story Intelligence

- Story 1.1 removed `admin_users` from the clean migration chain but intentionally left active runtime auth/seed paths deferred.
- Story 1.1 added forward identity schema and types, plus static migration tests that read every sorted migration file like [scripts/migrate.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/migrate.mts).
- Story 1.1 review specifically called out active auth and seed paths still querying removed `admin_users`; this story must address seed/bootstrap, not session auth.
- Verified commands from Story 1.1 were `npm run test`, `npm run typecheck`, and `npm run lint`; `npm run migrate` was skipped because no clean local Postgres target was identified.

### Git Intelligence

- Recent relevant commit baseline is `16e494c udpating plan`; the previous story records `baseline_commit: 16e494cc548a8f05777c0fc23943546e4014c138`.
- Current working tree is dirty with prior BMAD/story implementation changes. Do not revert unrelated changes while implementing this story.
- The codebase has older feature commits for WhatsApp CMS, UI polish, and donations; those are historical context only and should not drive Story 1.2 scope.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.2-Seed-V0-Roles-And-First-Super-Admin]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-8---Super-admin-identity-is-phone-OTP-with-no-V0-super-admin-role-hierarchy]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-18---V0-role-seeds-and-capabilities-are-fixed]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-1---Data-And-Auth-Spine]
- [Source: _bmad-output/implementation-artifacts/1-1-create-forward-identity-schema.md#Review-Findings]
- Latest package checks: Next.js and `pg` npm package pages, Firebase JS release notes, and Vitest npm/package docs checked on 2026-07-18.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- lib/db/role-definitions.test.ts lib/db/super-admins.test.ts scripts/seed-bootstrap.test.ts` failed before implementation: missing `role-definitions`, `super-admins`, `seed:super-admin`, and old seed paths still used `admin_users`/`getPilotTenant()`.
- `npm run test -- lib/db/role-definitions.test.ts lib/db/super-admins.test.ts scripts/seed-bootstrap.test.ts` passed after implementation: 3 files, 9 tests.
- `npm run test -- lib/db/role-definitions.test.ts lib/db/super-admins.test.ts scripts/seed-bootstrap.test.ts migrations/identity-schema.test.ts lib/phone.test.ts` passed: 5 files, 19 tests.
- `npm run test` passed: 20 files, 140 tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run migrate` and live `seed:super-admin` were not run because no clean local Postgres target was identified for this story run; repository/static tests covered SQL and script guardrails.
- Code review found 3 patch items and 1 deferred setup-doc item.
- Review patch validation passed: `npm run test -- lib/db/role-definitions.test.ts lib/db/super-admins.test.ts scripts/seed-bootstrap.test.ts` passed 3 files and 11 tests.
- Review patch full validation passed: `npm run test` passed 20 files and 142 tests; `npm run typecheck` passed; `npm run lint` passed.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Sprint status was not updated because `_bmad-output/implementation-artifacts/sprint-status.yaml` does not exist in this checkout.
- Story was inferred as the next sequential backlog story after completed Story 1.1.
- Implemented V0 role catalog seeding through `lib/db/role-definitions.ts`, with fixed active roles and pinned capability JSON.
- Implemented first-super-admin upsert through `lib/db/super-admins.ts`, normalizing phone input and writing only `super_admins`.
- Added explicit `npm run seed:super-admin` CLI with `--phone`/`--name` args plus env fallbacks.
- Updated `npm run seed` to seed roles and optionally bootstrap a super admin without `admin_users` or `getPilotTenant()`.
- Updated local bootstrap docs/comments so production super-admin bootstrap points to `seed:super-admin`; legacy `seed:admin` remains separate from this story's production path.
- Verified with focused tests, full test suite, typecheck, and lint.
- Resolved code review patches by guarding first-super-admin bootstrap against a different active super admin, deactivating non-V0 active roles during role seed, and wrapping role seed writes in a transaction.

### Implementation Plan

- Added small DB repositories mirroring existing `lib/db/*` style: row mapper, exported seed/upsert function, and parameterized `pg` queries.
- Kept `seed-admin.mts` and active dashboard auth untouched because Story 1.3 through Story 1.5 own session/auth replacement.
- Avoided hardcoding the real first super-admin phone number in source; implementation accepts it through CLI args or `SUPER_ADMIN_PHONE_NUMBER`.
- After review, kept the first-super-admin path intentionally narrow: additional active platform admins need a later explicit add-admin flow.

### File List

- `README.md`
- `_bmad-output/implementation-artifacts/1-2-seed-v0-roles-and-first-super-admin.md`
- `lib/db/role-definitions.ts`
- `lib/db/role-definitions.test.ts`
- `lib/db/super-admins.ts`
- `lib/db/super-admins.test.ts`
- `migrations/002_seed_pilot_tenant.sql`
- `package.json`
- `scripts/seed-bootstrap.test.ts`
- `scripts/seed-super-admin.mts`
- `scripts/seed.mts`

## Change Log

- 2026-07-18: Implemented Story 1.2 V0 role seeding, first-super-admin bootstrap, production seed script guardrails, tests, and story status update to review.
- 2026-07-18: Applied code review patches for first-super-admin uniqueness, fixed active role catalog enforcement, transactional role seeding, and updated story status to done.
