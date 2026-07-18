---
baseline_commit: 5e593d85ff7ce2adccd5c8300126e45b02bb08d3
created_at: 2026-07-18T22:52:59+0530
story_generation_note: "Created from Story 1.6 using bmad-create-story before Amelia/dev execution."
---

# Story 1.6: Identity And Session Isolation Tests

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want tests proving super-admin and tenant-admin sessions cannot cross-authorize,
so that the new identity model is trusted before provisioning builds on it.

## Acceptance Criteria

1. Given automated tests run for identity and auth, when a tenant admin calls a super-admin route, then the request is rejected, and the test proves tenant `admin` role does not satisfy `requireSuperAdmin()`.
2. Given automated tests run for tenant login, when a user belongs to Temple A and Temple B with different roles, then login from Temple A hostname creates only a Temple A session, and Temple A role codes do not authorize Temple B requests.
3. Given automated tests run for generic host handling, when tenant login is attempted from apex or `www` hosts, then no tenant session is created, and the invalid host behavior is asserted.
4. Given automated tests run in a production-like environment, when a local tenant host override is configured, then the override is rejected, and the test prevents local-only tenant resolution from leaking into production.

## Tasks / Subtasks

- [x] Consolidate identity/session guardrail coverage into an explicit Story 1.6 test surface. (AC: 1, 2, 3, 4)
  - [x] Add a focused test file such as `app/api/identity-session-isolation.test.ts` or equivalent that imports no production code beyond route handlers/helpers under test.
  - [x] The test file must exercise the existing route/helper behavior; avoid adding new auth logic unless a gap is found.
  - [x] Keep tests deterministic with Vitest mocks and `vi.stubEnv()`/`vi.unstubAllEnvs()` where environment behavior is asserted.

- [x] Prove tenant admin sessions cannot satisfy super-admin authorization. (AC: 1)
  - [x] Assert `/api/super-admin/me` returns `403` when only a valid tenant `templeos_session` exists with `roles: ["admin"]`.
  - [x] Assert `requireSuperAdmin()` returns `null` for tenant-shaped or tenant-only session state.
  - [x] Preserve the distinction that no valid super-admin session is `401`, while a valid tenant session without platform privilege is `403`.

- [x] Prove tenant login/session creation is host-derived and role-isolated. (AC: 2)
  - [x] Assert `/api/auth/session` resolves the target `tenantId` from `tenant_domains.hostname`, not request body/query tenant IDs.
  - [x] Use the same person with different mocked memberships for Temple A and Temple B; confirm the created cookie payload uses only the hostname-resolved tenant/membership/roles.
  - [x] Assert a membership/session tenant mismatch is rejected by `getSessionAdmin()` so Temple A role codes cannot authorize Temple B session reads.

- [x] Prove generic host and production override guardrails. (AC: 3, 4)
  - [x] Assert `trytempleos.com` and `www.trytempleos.com` tenant login attempts return `400` with `INVALID_TENANT_CONTEXT` and do not set a tenant session cookie.
  - [x] Assert `TEMPLEOS_LOCAL_TENANT_HOST` works only outside production.
  - [x] Assert `TEMPLEOS_LOCAL_TENANT_HOST` is rejected when `NODE_ENV=production` before tenant-domain lookup or cookie creation.

- [x] Add static boundary checks for future regression prevention. (AC: 1, 2, 3, 4)
  - [x] Assert super-admin route sources and `lib/auth/super-admin-session.ts` do not import tenant-admin helpers, `getSessionAdmin()`, legacy `admin_users`, or `getPilotTenant()` as authorization sources.
  - [x] Preserve existing tenant dashboard boundary checks that tenant APIs do not import super-admin helpers or read client-supplied `tenantId`.
  - [x] If an existing boundary test already covers part of this, extend it rather than duplicating broad file scanners.

- [x] Verify implementation. (AC: 1, 2, 3, 4)
  - [x] Run the new/focused Story 1.6 tests and confirm they pass.
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.

### Review Findings

- [x] [Review][Patch] Add a real `requireSuperAdmin()` rejection assertion for tenant-shaped super-admin cookie payloads [app/api/identity-session-isolation.test.ts:120]
- [x] [Review][Patch] Strengthen AC2 by proving Temple A admin credentials cannot authorize Temple B request context or by asserting tenant cookies are host-only [app/api/identity-session-isolation.test.ts:194]
- [x] [Review][Patch] Tighten the static super-admin boundary test so relative imports of tenant admin auth are also caught [app/api/identity-session-isolation.test.ts:323]
- [x] [Review][Patch] Remove the generated create-story completion note from the implemented Story 1.6 dev record [_bmad-output/implementation-artifacts/1-6-identity-and-session-isolation-tests.md:141]

## Dev Notes

### Controlling Context

- Use [_bmad-output/planning-artifacts/epics.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/epics.md) as the controlling source for Story 1.6.
- Use [_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md) and [_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md) as the governing architecture.
- The older MVP PRD is stale for this slice where it conflicts with the July 18 super-admin architecture. `admin_users` and `getPilotTenant()` are historical context only.
- Story 1.6 is a guardrail-test story. It should not build provisioning, tenant switching, new auth surfaces, or new role semantics.

### Current State To Test

- [lib/auth/super-admin-session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/super-admin-session.ts) uses cookie `templeos_super_admin_session`, token payload `{ superAdminId, phoneNumber, displayName, exp }`, rejects tenant-shaped payloads, and live-checks `super_admins` through `getSuperAdminById()`.
- [app/api/super-admin/me/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/super-admin/me/route.ts) calls `requireSuperAdmin()`. It returns `403` when a valid tenant session cookie is present without platform privilege and `401` when no valid platform or tenant session exists.
- [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts) uses cookie `templeos_session`, token payload `{ tenantId, personId, membershipId, roles, phoneNumber, displayName, exp }`, and live-checks `getTenantMembershipById()` to reject stale tenant/person mismatches.
- [app/api/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts) resolves tenant context from hostname or local-only `TEMPLEOS_LOCAL_TENANT_HOST`, rejects generic hosts, finds `persons` by Firebase phone, finds active membership for the hostname-resolved tenant, and sets only the membership-shaped tenant session.
- [lib/tenant-domains.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/tenant-domains.ts) normalizes hostnames and treats `trytempleos.com`, `www.trytempleos.com`, and `localhost` as generic tenant hosts that cannot create tenant sessions.
- Existing partial coverage lives in [app/api/super-admin/me/route.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/super-admin/me/route.test.ts), [lib/auth/super-admin-session.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/super-admin-session.test.ts), [app/api/auth/session/route.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.test.ts), [lib/auth/session-live.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session-live.test.ts), and [app/api/tenant-dashboard-auth-boundary.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/tenant-dashboard-auth-boundary.test.ts).

### Architecture Compliance

- AD-1: super-admin authorization is separate from tenant membership; tenant `admin` cannot become cross-tenant root access.
- AD-3: tenant dashboard APIs derive `tenant_id` only from tenant sessions; only super-admin APIs may accept explicit tenant IDs after super-admin auth.
- AD-8: super-admin auth uses phone OTP against `super_admins` and a distinct session payload/cookie.
- AD-12: authorization is `person_id + tenant_id + role_code`; a person's Temple A roles do not authorize Temple B.
- AD-14: temple login resolves tenant by subdomain; generic product hosts do not create tenant sessions.
- AD-19: local tenant host override is local-only and must not run in production.

### Previous Story Intelligence

- Story 1.3 created the super-admin session boundary and `/api/super-admin/me` distinction between unauthenticated (`401`) and tenant-authenticated-but-not-platform-authorized (`403`).
- Story 1.4 implemented tenant login as hostname -> `tenant_domains`, Firebase phone -> `persons`, membership -> active `tenant_memberships`, roles -> active `role_definitions`, and tenant session -> membership-shaped payload.
- Story 1.4 review hardened `getSessionAdmin()` so it live-checks membership by ID and rejects tenant/person mismatches. Reuse this for Temple A/Temple B session isolation.
- Story 1.5 centralized tenant dashboard admin authorization in `lib/auth/tenant-admin.ts`, added static boundary tests, and confirmed tenant dashboard APIs do not use super-admin cookies or helpers.

### Library / Framework Requirements

- Use the repo's current stack from [package.json](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/package.json): Next.js `16.2.10`, React `19.2.4`, Firebase JS SDK `^12.16.0`, Firebase Admin SDK `^14.2.0`, `pg` `^8.22.0`, Zod `^4.4.3`, TypeScript `^5`, and Vitest `^4.1.10`.
- Vitest module mocking should follow the existing repo pattern and current Vitest guidance: use `vi.mock`, reset mocks between tests, and use dynamic `import()`-style mocks only where type safety benefits the local file. No new test dependency is needed.
- Do not add Auth.js, Prisma, Drizzle, JWT libraries, policy engines, browser automation, or E2E tooling for this story.

### Testing Notes

- Prefer one focused Story 1.6 test file that references existing route/helper behavior, then leave existing narrower tests in place.
- For route-handler tests, mock Firebase, DB repository functions, cookies, and session helpers at module boundaries. Do not hit a real database.
- Use `vi.unstubAllEnvs()` in `beforeEach()` for tests that mutate `NODE_ENV` or `TEMPLEOS_LOCAL_TENANT_HOST`.
- Static boundary tests should be specific enough to prevent the auth mistakes from returning, without scanning unrelated WhatsApp or future provisioning code.

### Non-Goals

- Do not implement super-admin tenant provisioning, temple list/view/update APIs, tenant member management, or role assignment.
- Do not create a generic tenant picker or allow login from apex/product hosts.
- Do not revive `admin_users`, `requireLegacyTenantSuperAdmin()`, tenant-local super-admin semantics, or `getPilotTenant()` in auth/provisioning paths.
- Do not change Firebase OTP behavior except to test existing server-side token verification boundaries.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.6-Identity-And-Session-Isolation-Tests]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-1---Super-admins-are-separate-from-tenant-members-ADOPTED]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-8---Super-admin-identity-is-phone-OTP-with-no-V0-super-admin-role-hierarchy]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-12---Person-identity-is-global-membership-and-roles-are-tenant-scoped]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-14---Temple-owned-login-resolves-tenant-by-subdomain]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-19---Tenant-domain-stores-full-normalized-hostnames]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-6---Guardrails-And-Tests]
- Latest documentation checked on 2026-07-18: Vitest v4 module mocking and mock reset guidance.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- app/api/identity-session-isolation.test.ts` - RED failed as expected in the new Story 1.6 focused test harness because a dynamic mock for `@/lib/auth/session` persisted before the live-session isolation assertion.
- `npm run test -- app/api/identity-session-isolation.test.ts` - passed, 1 file / 8 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run test` - passed, 35 files / 217 tests.
- `git diff --check` - passed.
- `npm run test -- app/api/identity-session-isolation.test.ts` - review patches passed, 1 file / 10 tests.
- `npm run typecheck` - review patches passed.
- `npm run lint` - review patches passed.
- `npm run test` - review patches passed, 35 files / 219 tests.

### Completion Notes List

- Added explicit Story 1.6 identity/session isolation guardrails in `app/api/identity-session-isolation.test.ts`.
- Proved tenant `admin` sessions cannot satisfy super-admin authorization and keep the `/api/super-admin/me` `401` versus `403` distinction.
- Proved tenant login derives session tenant/membership/roles from hostname-resolved `tenant_domains`, ignoring client-supplied tenant IDs.
- Proved live tenant session reads reject membership tenant mismatches, so Temple A role codes cannot authorize Temple B session reads.
- Proved apex and `www` product hosts cannot create tenant sessions, and local host override is rejected in production before lookup/cookie creation.
- Added static guardrails preventing super-admin routes/session helpers from using tenant dashboard authorization or legacy auth sources.
- Resolved code review findings: real `requireSuperAdmin()` tenant-shaped super-admin cookie rejection, host-only tenant cookie assertion, stricter tenant-admin import boundary, and story note cleanup.

### Change Log

- 2026-07-18: Created Story 1.6 context and moved story to ready-for-dev.
- 2026-07-18: Implemented Story 1.6 isolation guardrail tests and moved story to review.
- 2026-07-18: Resolved Story 1.6 code review findings and moved story to done.

### File List

- app/api/identity-session-isolation.test.ts
- _bmad-output/implementation-artifacts/1-6-identity-and-session-isolation-tests.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
