---
baseline_commit: 5427dbafc6729043020ad24660c0bb66067d2ce0
---

# Story 1.7: Unify Firebase Auth Identity Binding

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want Firebase UID ownership to live on the global person identity while super-admin access remains a separate authorization boundary,
so that the same human can be both a super admin and a tenant member without duplicate or drifting Firebase bindings.

## Acceptance Criteria

1. Given a clean database reset or migration chain, when identity tables are created or migrated, then `persons.firebase_uid` is the canonical Firebase UID storage, `super_admins` references a `person_id`, and the system does not require two independent Firebase UID bindings for the same human.
2. Given an existing `super_admins` row with no matching `persons` row, when the migration/backfill runs, then a `persons` row is created or reused by normalized `phone_number`, `super_admins.person_id` is populated, and no tenant membership is created.
3. Given an existing `super_admins.firebase_uid` value and a matching or newly-created `persons` row, when the migration/backfill runs, then the Firebase UID is copied to `persons.firebase_uid` only if empty or already equal; conflicts are detected and fail closed rather than silently overwriting either identity.
4. Given a super admin completes Firebase phone OTP, when `/api/super-admin/auth/session` verifies the ID token, then the route binds or validates `decoded.uid` through the linked `person` identity and still creates only `templeos_super_admin_session`.
5. Given a tenant member completes Firebase phone OTP, when `/api/auth/session` verifies the ID token, then tenant login continues to bind or validate the same `persons.firebase_uid`, derives tenant scope from hostname, and still creates only `templeos_session`.
6. Given the same phone belongs to both `super_admins` and `persons`, when the person logs into either surface with the same Firebase account, then both login paths succeed against the same `persons.firebase_uid`; when the Firebase UID differs, both paths reject without setting cookies.
7. Given a Firebase user is deleted/recreated or a binding becomes stale, when an authorized maintenance helper clears the person's auth binding, then only `persons.firebase_uid` is cleared, an audit trail or explicit script log is produced, and the next successful OTP login rebinds the current Firebase UID.
8. Given automated tests run, then migration/schema tests, repository tests, route tests, and identity-session isolation tests prove there is no cross-session authorization regression and no independent `super_admins.firebase_uid` runtime dependency remains.

## Tasks / Subtasks

- [x] Add identity migration without dropping tables first. (AC: 1, 2, 3)
  - [x] Add the next numbered SQL migration, expected as `migrations/011_super_admin_person_identity.sql` unless another migration number already exists.
  - [x] Add nullable `super_admins.person_id UUID REFERENCES persons(id)` first.
  - [x] Backfill by normalized `super_admins.phone_number`: insert missing `persons(phone_number, display_name, firebase_uid)` rows, reuse existing persons by phone, and set `super_admins.person_id`.
  - [x] Fail the migration on UID conflicts where `super_admins.firebase_uid` and matching `persons.firebase_uid` are both non-null and different.
  - [x] After backfill, make `super_admins.person_id` `NOT NULL` and `UNIQUE`.
  - [x] Do not drop `super_admins.firebase_uid` in this story unless all code/tests prove it is unused and the migration remains safe for existing environments. Prefer deprecating it first; a later cleanup can drop it.

- [x] Move repository reads and binding to person-owned UID. (AC: 1, 4, 6)
  - [x] Update `types/db.ts` so `SuperAdmin` includes `personId`; preserve current fields only where needed for compatibility.
  - [x] Update `lib/db/super-admins.ts` mappings to read `person_id`, and return/derive `firebaseUid` from the joined `persons.firebase_uid` for super-admin session checks.
  - [x] Replace `bindSuperAdminFirebaseUid()` implementation so it updates the linked `persons.firebase_uid`, not `super_admins.firebase_uid`.
  - [x] Keep `upsertFirstSuperAdmin()` from creating tenant memberships; it may create/reuse a `persons` row only if needed to satisfy `person_id`.
  - [x] Reuse `normalizePhoneNumber()` and existing `persons` helpers/patterns rather than introducing a new auth library or ORM.

- [x] Preserve tenant login and session isolation. (AC: 4, 5, 6, 8)
  - [x] Keep `/api/auth/session` tenant lookup order: verify Firebase token, resolve host through `tenant_domains`, find `person` by phone, verify active membership, bind/check `persons.firebase_uid`, set `templeos_session`.
  - [x] Keep `/api/super-admin/auth/session` lookup order: verify Firebase token, find active super admin by phone, bind/check linked `person.firebase_uid`, set `templeos_super_admin_session`.
  - [x] Do not merge tenant and super-admin cookies, payload shapes, route guards, or privilege checks.
  - [x] Keep `requireSuperAdmin()` backed by `super_admins.active`; a person row alone must not grant platform access.

- [x] Add a stale-binding reset path. (AC: 7)
  - [x] Add a small maintenance helper or script that clears `persons.firebase_uid` for one normalized phone or person ID after an operator has verified ownership out of band.
  - [x] Require exact input and print/log the affected person ID and phone number; do not bulk-clear bindings.
  - [x] If using `audit_log`, write actor metadata only when an authenticated actor is available; for a CLI script, produce an explicit operator log line.

- [x] Extend tests before implementation. (AC: 1-8)
  - [x] Extend `migrations/identity-schema.test.ts` to assert `super_admins.person_id`, uniqueness, FK to `persons(id)`, and conflict-protecting migration text.
  - [x] Extend `lib/db/super-admins.test.ts` for `personId` mapping and UID binding through `persons.firebase_uid`.
  - [x] Extend `lib/db/persons.test.ts` only if adding a new reset/bind helper there.
  - [x] Extend `app/api/super-admin/auth/session/route.test.ts` so super-admin login calls the revised binding path and rejects mismatched UID.
  - [x] Extend `app/api/auth/session/route.test.ts` and/or `app/api/identity-session-isolation.test.ts` to prove a shared Firebase UID works across both surfaces while cookies and authorization remain separate.

## Dev Notes

### Current State

- `migrations/001_initial_schema.sql` currently creates both `super_admins.firebase_uid` and `persons.firebase_uid`; only `persons.firebase_uid` has a partial unique index. [Source: migrations/001_initial_schema.sql]
- `lib/db/super-admins.ts` currently inserts super admins by phone/name only and lazily updates `super_admins.firebase_uid` in `bindSuperAdminFirebaseUid()`. [Source: lib/db/super-admins.ts]
- `lib/db/persons.ts` currently owns tenant-person lookup and lazily updates `persons.firebase_uid` in `bindPersonFirebaseUid()`. [Source: lib/db/persons.ts]
- `/api/super-admin/auth/session` verifies a Firebase ID token, finds the active super admin by token phone number, binds UID, and sets only the super-admin cookie. [Source: app/api/super-admin/auth/session/route.ts]
- `/api/auth/session` verifies a Firebase ID token, resolves tenant host, finds the person by token phone number, verifies active membership, binds UID, and sets only the tenant cookie. [Source: app/api/auth/session/route.ts]

### Architecture Direction

- Keep authorization split, unify identity binding.
- `persons` is the global human identity. `tenant_memberships` and roles remain tenant-scoped. [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-12---Person-identity-is-global;-membership-and-roles-are-tenant-scoped]
- Super-admin access remains platform authorization. A `person` row with a Firebase UID is not enough to access super-admin routes; an active `super_admins` row is still required.
- Do not drop the `super_admins` table. It still represents platform access, active/inactive state, and future super-admin metadata. The change is about moving Firebase UID ownership out of that table.
- Do not create tenant memberships for super admins unless they are explicitly added to a tenant. A person may exist without a tenant membership when they are a super admin. [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-17---persons-are-created-through-provisioning-login-and-explicit-member-management]

### Migration Plan

Recommended migration sequence:

1. Add `super_admins.person_id` nullable.
2. Abort on cross-table UID conflict before writes:
   - same normalized phone exists in both tables
   - both Firebase UID values are non-null
   - values differ
3. Insert missing `persons` from `super_admins` using `phone_number`, `display_name`, and existing `firebase_uid`.
4. For matching persons with null UID, copy non-null `super_admins.firebase_uid` into `persons.firebase_uid`.
5. Backfill `super_admins.person_id` by phone.
6. Add `NOT NULL`, `UNIQUE`, and FK constraints.
7. Leave `super_admins.firebase_uid` present but deprecated for one story to reduce rollback risk.

### File Structure Notes

- Update migration SQL in `migrations/`.
- Update migration assertions in `migrations/identity-schema.test.ts`.
- Update repository code in `lib/db/super-admins.ts` and possibly `lib/db/persons.ts`.
- Update auth routes only if required by changed repository signatures:
  - `app/api/super-admin/auth/session/route.ts`
  - `app/api/auth/session/route.ts`
- Update session helpers only if the `SuperAdmin` type requires `personId` in runtime checks:
  - `lib/auth/super-admin-session.ts`
  - `lib/auth/session.ts`
- Add any maintenance script under `scripts/`; follow the existing `load-env.mts` and `getPool().end()` style from `scripts/seed-super-admin.mts`.

### Security Guardrails

- Fail closed on UID conflicts. Do not silently overwrite a non-null Firebase UID.
- Keep phone number as the allowlist/matching key, but keep Firebase UID as the durable auth-account binding once established.
- Do not accept `personId`, `superAdminId`, `firebaseUid`, role codes, or audit actor IDs from an untrusted login request body.
- Firebase Admin `verifyIdToken()` returns decoded claims including `uid`; revocation checking is optional and not currently enabled in `lib/firebase/admin.ts`. Do not change revocation behavior unless a separate requirement is accepted. [Source: https://firebase.google.com/docs/auth/admin/verify-id-tokens]

### Dev Agent Review

Amelia implementation preference:

- Start red with `migrations/identity-schema.test.ts` and `lib/db/super-admins.test.ts`.
- Keep API route tests mocked at repository boundaries; do not require live Firebase or Postgres.
- Preserve existing response codes:
  - super-admin missing session: `401 UNAUTHENTICATED`
  - tenant-session-only caller on super-admin route: `403 FORBIDDEN`
  - Firebase UID mismatch on super-admin login: `403 FIREBASE_UID_MISMATCH`
  - tenant Firebase UID mismatch: generic `403 NOT_AUTHORIZED`
- Run focused tests first, then broader guardrails:
  - `npm run test -- migrations/identity-schema.test.ts lib/db/super-admins.test.ts lib/db/persons.test.ts`
  - `npm run test -- app/api/super-admin/auth/session/route.test.ts app/api/auth/session/route.test.ts app/api/identity-session-isolation.test.ts`
  - `npm run typecheck`

### Latest Technical Information

- Firebase Admin SDK ID token verification is still the correct server-side pattern for custom backends. The server verifies the client ID token and reads `decoded.uid` as the Firebase user identifier. [Source: https://firebase.google.com/docs/auth/admin/verify-id-tokens]
- The Firebase Admin Node reference documents `verifyIdToken(idToken, checkRevoked?)`; checking revocation adds an extra backend check and is not the current TempleOS behavior. [Source: https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.baseauth]

## Project Structure Notes

- This story intentionally revises part of the earlier minimum schema, where both `super_admins` and `persons` had `firebase_uid`. The correction preserves the earlier business boundary but improves the identity model.
- Existing architecture text that says `super_admins.firebase_uid` exists should be treated as superseded for this specific auth-binding concern after this story is implemented.

## References

- [Source: migrations/001_initial_schema.sql]
- [Source: migrations/identity-schema.test.ts]
- [Source: lib/db/super-admins.ts]
- [Source: lib/db/persons.ts]
- [Source: app/api/super-admin/auth/session/route.ts]
- [Source: app/api/auth/session/route.ts]
- [Source: lib/auth/super-admin-session.ts]
- [Source: lib/auth/session.ts]
- [Source: app/api/identity-session-isolation.test.ts]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md]
- [Source: https://firebase.google.com/docs/auth/admin/verify-id-tokens]
- [Source: https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.baseauth]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Red phase: `npm run test -- migrations/identity-schema.test.ts lib/db/super-admins.test.ts lib/db/persons.test.ts` failed before implementation because `clearPersonFirebaseUidByPhone` did not exist, super-admin rows did not expose `personId`, and super-admin UID binding still updated `super_admins`.
- Green phase: focused repository/migration tests passed after adding migration 011 and person-owned binding.
- Validation: `npm run test`, `npm run typecheck`, and `npm run lint`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added migration 011 to link every super admin to a global person, backfill person Firebase UID values, fail on conflicting UID data, enforce `super_admins.person_id`, and drop `super_admins.firebase_uid`.
- Updated super-admin repository reads and Firebase UID binding so super-admin auth validates the linked `persons.firebase_uid`.
- Added a narrow `auth:clear-firebase` maintenance command that clears one person's stale Firebase UID binding by normalized phone.
- Preserved separate tenant and super-admin session cookies and route guards; a person row alone still does not grant super-admin access.
- Verified with full tests, typecheck, and lint. Lint exits 0 with two existing unused-import warnings in super-admin pages.

### File List

- `_bmad-output/implementation-artifacts/1-7-unify-firebase-auth-identity-binding.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/api/identity-session-isolation.test.ts`
- `app/api/super-admin/auth/session/route.test.ts`
- `app/api/super-admin/me/route.test.ts`
- `app/api/super-admin/roles/route.test.ts`
- `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts`
- `app/api/super-admin/temples/[tenantId]/route.test.ts`
- `app/api/super-admin/temples/route.test.ts`
- `lib/auth/super-admin-session.test.ts`
- `lib/db/persons.test.ts`
- `lib/db/persons.ts`
- `lib/db/super-admins.test.ts`
- `lib/db/super-admins.ts`
- `migrations/011_super_admin_person_identity.sql`
- `migrations/identity-schema.test.ts`
- `package.json`
- `scripts/clear-person-firebase-uid.mts`
- `scripts/seed-bootstrap.test.ts`
- `scripts/seed-super-admin.mjs`
- `types/db.ts`

### Change Log

- 2026-07-19: Implemented unified person-owned Firebase UID binding for super admins and tenant persons; status moved to review.
