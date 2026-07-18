---
baseline_commit: 2ad9082
story_generation_note: "Explicitly requested as next Story 1.5 using bmad-agent-dev and bmad-create-story."
created_at: 2026-07-18T21:32:24+0530
---

# Story 1.5: Enforce Role-Based Tenant Dashboard Access

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a temple,
I want only members with the V0 admin role to access the tenant dashboard,
so that identity-marker roles do not accidentally grant management access.

## Acceptance Criteria

1. Given an active tenant membership has the `admin` role, when the member opens the tenant dashboard, then dashboard access is allowed, and server-side route guards derive `tenantId`, `personId`, `membershipId`, and role codes from the tenant session.
2. Given an active tenant membership has only `priest`, `committee_member`, `volunteer`, or `devotee`, when the member opens the tenant dashboard, then dashboard access is denied, and the denial uses `403` rather than falling back to super-admin authorization.
3. Given a tenant dashboard API reads or writes tenant-owned data, when the request is handled, then the API derives `tenant_id` from the tenant session, and it does not accept a client-supplied tenant ID.
4. Given a super-admin session exists in the browser, when the user calls tenant dashboard APIs without a valid tenant session, then the tenant route rejects the request, and super-admin cookies are not used as tenant membership proof.

## Tasks / Subtasks

- [x] Add a reusable tenant admin authorization helper. (AC: 1, 2, 3, 4)
  - [x] Extend [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts) or add a small adjacent helper such as `requireTenantAdminSession()` that calls `getSessionAdmin()` and then requires `roles.includes("admin")`.
  - [x] Preserve `getSessionAdmin()` as the live membership session loader; do not make authorization depend only on stale role codes inside the cookie.
  - [x] Return a typed result or throw/return a stable denial shape that lets API routes distinguish missing session (`401`) from insufficient role (`403`).
  - [x] Do not import or call [lib/auth/super-admin-session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/super-admin-session.ts) from tenant dashboard authorization.

- [x] Gate server-rendered tenant dashboard pages by the V0 `admin` role. (AC: 1, 2, 4)
  - [x] Update [app/(dashboard)/layout.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/(dashboard)/layout.tsx) so missing tenant sessions still redirect to `/login`.
  - [x] For an active non-admin membership, return a `403` dashboard access-denied response. Prefer a route-level `forbidden()`/error boundary only if already supported by this Next version and repo conventions; otherwise add a simple server-rendered access-denied surface inside the dashboard route group.
  - [x] Ensure the allowed path still passes the session into [features/dashboard/dashboard-shell.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/features/dashboard/dashboard-shell.tsx) unchanged.
  - [x] Update [app/page.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/page.tsx) if needed so non-admin tenant members are not blindly redirected into `/dashboard` as if they were admins.

- [x] Gate tenant dashboard API routes with the same admin-role helper. (AC: 1, 2, 3, 4)
  - [x] Update every `app/api/**` route that currently calls `getSessionAdmin()` for dashboard-owned reads or writes, including events, devotees, donations, tenant settings, temple special days, sevas, FAQs, social links, and announcement routes.
  - [x] Keep all repository calls scoped with `session.tenantId`; do not add `tenantId` request body, query string, or path parameters for tenant dashboard APIs.
  - [x] Preserve existing validation and conflict behavior after authorization succeeds.
  - [x] Preserve retired admin-management endpoints [app/api/admins/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/route.ts) and [app/api/admins/[id]/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/[id]/route.ts) as `410`; do not revive `admin_users`.

- [x] Add focused authorization tests. (AC: 1, 2, 3, 4)
  - [x] Add or extend tests for the new tenant admin helper: valid admin allowed, active non-admin denied with `403`, missing/stale membership denied as `401`.
  - [x] Add a layout/root-page level test if practical, or a focused helper test that proves non-admin tenant members cannot satisfy dashboard access.
  - [x] Add route-handler tests for representative tenant APIs: at minimum one read route and one write route prove `401` without tenant session, `403` with only `priest`/`committee_member`/`volunteer`/`devotee`, and success with `admin`.
  - [x] Add a static boundary test proving tenant dashboard APIs and helpers do not import `requireSuperAdmin()`, `getSuperAdminSession()`, or `templeos_super_admin_session`.
  - [x] Add a static/request-body regression assertion for representative tenant APIs proving they do not accept client-supplied tenant IDs.

- [x] Verify implementation. (AC: 1, 2, 3, 4)
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.
  - [x] If a configured Firebase/Auth flow is available, manually verify a tenant member with only `volunteer` or `devotee` can authenticate but cannot open the dashboard or call tenant APIs.

### Review Findings

- [x] [Review][Patch] Dashboard leaf pages still authorize with raw tenant sessions [app/(dashboard)/dashboard/page.tsx:35]
- [x] [Review][Patch] Static no-super-admin boundary test misses the tenant-admin helper [app/api/tenant-dashboard-auth-boundary.test.ts:25]

## Dev Notes

### Controlling Context

- Use [_bmad-output/planning-artifacts/epics.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/epics.md) as the controlling story source for Story 1.5.
- Use [_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md) and [_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md) as the governing architecture for the forward identity and tenant membership slice.
- The older PRD says MVP tenant auth used `admin_users` and one pilot tenant. For Story 1.5, that is superseded by the current epics and architecture: tenant dashboard access is membership-role based, and `admin_users` is historical only.
- Story 1.5 owns V0 `admin` dashboard authorization. It does not own tenant member management UI, super-admin role assignment APIs, provisioning, or a generic tenant picker.

### Current State To Modify

- [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts) already defines tenant sessions as `{ tenantId, personId, membershipId, roles, phoneNumber, displayName, exp }`, reads the `templeos_session` cookie, verifies the signed token, live-loads `getTenantMembershipById(session.membershipId)`, rejects stale tenant/person mismatches, and returns current membership roles/display name. Build the admin check on top of this live-loaded result.
- [lib/db/tenant-memberships.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/tenant-memberships.ts) already loads active memberships and active role codes by joining `tenant_membership_roles` to active `role_definitions`.
- [app/(dashboard)/layout.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/(dashboard)/layout.tsx) currently redirects only when `getSessionAdmin()` returns `null`; it does not deny active non-admin memberships.
- [app/page.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/page.tsx) currently redirects any valid tenant session to `/dashboard`; decide whether this should send non-admin members to an access-denied page instead.
- Tenant API routes currently call `getSessionAdmin()` and then use `session.tenantId` correctly. Representative examples are [app/api/events/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/events/route.ts), [app/api/devotees/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/devotees/route.ts), and [app/api/donations/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/donations/route.ts). The story should centralize the admin-role check without weakening tenant scoping.
- [app/api/admins/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/route.ts) and [app/api/admins/[id]/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/[id]/route.ts) are intentionally retired with `410 TENANT_ADMIN_MANAGEMENT_RETIRED`. Preserve that state.

### Architecture Compliance

- AD-1: super-admins are separate from tenant members. Tenant dashboard authorization must not use super-admin cookies or helpers.
- AD-3: tenant dashboard APIs derive `tenant_id` only from the resolved tenant session. Only super-admin-authorized APIs may accept explicit tenant IDs.
- AD-12: authorization is evaluated as `person_id + tenant_id + role_code`; one person's role in Temple A must not authorize Temple B.
- AD-13: role definitions are platform-governed; authorization must use stable role codes, not display labels.
- AD-18: only `admin` has V0 dashboard access and tenant member/role management; `priest`, `committee_member`, `volunteer`, and `devotee` are identity markers without V0 dashboard permission by themselves.
- Consistency convention: missing/invalid session returns `401`; authenticated but insufficient privilege returns `403`; tenant and super-admin sessions use separate helper modules, cookie names, and payload types.

### Recommended Authorization Shape

Use one narrow abstraction so every dashboard route makes the same decision:

```ts
type TenantAdminAuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; status: 401 | 403; code: "UNAUTHORIZED" | "TENANT_ADMIN_REQUIRED" };
```

- `401`: no valid tenant session, stale membership, inactive membership, or tenant/person mismatch.
- `403`: valid active tenant membership but `roles` does not include `admin`.
- Success: return the live-loaded session from `getSessionAdmin()` and continue to use `session.tenantId`, `session.personId`, `session.membershipId`, and `session.roles`.
- Keep the helper framework-light; do not add Auth.js, CASL, Oso, middleware libraries, or custom role-capability engines for this story.

### API Surface To Audit

The current dashboard-owned routes using `getSessionAdmin()` are:

- `app/api/events/route.ts`
- `app/api/events/[id]/route.ts`
- `app/api/events/[id]/announce/route.ts`
- `app/api/devotees/route.ts`
- `app/api/devotees/[id]/route.ts`
- `app/api/devotees/[id]/donations/route.ts`
- `app/api/donations/route.ts`
- `app/api/donations/[id]/route.ts`
- `app/api/tenant/route.ts`
- `app/api/temple-special-days/route.ts`
- `app/api/temple-special-days/[id]/route.ts`
- `app/api/temple-sevas/route.ts`
- `app/api/temple-sevas/[id]/route.ts`
- `app/api/temple-faqs/route.ts`
- `app/api/temple-faqs/[id]/route.ts`
- `app/api/temple-social-links/[platform]/route.ts`

If additional tenant-dashboard API routes are added before implementation, include them in the same audit. Do not apply this helper to `app/api/auth/session/route.ts`, `app/api/super-admin/**`, or `app/api/whatsapp/webhook/route.ts`; those have different authorization sources.

### Previous Story Intelligence

- Story 1.4 replaced tenant login with host -> `tenant_domains`, phone -> `persons`, membership -> active `tenant_memberships`, roles -> active `role_definitions`, and session -> membership-shaped payload.
- Story 1.4 intentionally did not deny login for non-admin memberships. That means Story 1.5 must allow authentication to succeed but block dashboard/API management access when roles are marker-only.
- Story 1.4 review hardened stale membership behavior: `getSessionAdmin()` now live-checks `getTenantMembershipById()` on every read and rejects inactive/deleted/mismatched memberships. Preserve that live-check; do not regress to cookie-only role trust.
- Story 1.4 review retired the stale legacy admin-management surface with `410`; do not rebuild it as part of role enforcement.
- Story 1.4 review added `persons.firebase_uid` uniqueness and V0 role-code validation, so Story 1.5 can rely on `RoleCode` values instead of arbitrary strings.

### Git Intelligence

- Recent relevant commit: `2ad9082 Implement super admin phone OTP session`.
- Current story context includes uncommitted Story 1.4 implementation files and sprint-status changes. Treat them as the baseline for Story 1.5; do not revert or rewrite them.
- Recent pattern: add narrow auth/repository helpers, cover helper and route behavior with Vitest mocks, then run `npm run test`, `npm run typecheck`, and `npm run lint`.

### Library / Framework Requirements

- Use the repo's current stack from [package.json](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/package.json): Next.js `16.2.10`, React `19.2.4`, Firebase JS SDK `^12.16.0`, Firebase Admin SDK `^14.2.0`, `pg` `^8.22.0`, Zod `^4.4.3`, TypeScript `^5`, and Vitest `^4.1.10`.
- Latest docs checked on 2026-07-18:
  - Next `cookies()` is async; cookie read works in Server Components, while `.set()`/`.delete()` belong in Server Functions or Route Handlers. This matches the existing session helper split.
  - Next `redirect()` can be called from Server Components, Route Handlers, and Server Functions; it returns a temporary redirect by default and throws internally, so keep it outside broad `try/catch`.
  - Firebase Admin `verifyIdToken()` remains the backend verification primitive for Firebase ID tokens; this story should not alter Firebase login verification.
- Do not add Prisma, Drizzle, Auth.js/NextAuth, JWT libraries, policy-engine libraries, or new cookie/session dependencies.

### Testing Notes

- Follow current Vitest patterns from [lib/auth/session.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.test.ts), [lib/auth/session-live.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session-live.test.ts), and [app/api/auth/auth-boundary.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/auth-boundary.test.ts).
- For route tests, mock the tenant admin authorization helper rather than Firebase. Story 1.4 already tests Firebase/session creation; Story 1.5 tests role enforcement after session creation.
- Keep tests small but representative. It is acceptable to test the shared helper plus two representative API routes, then use a static boundary test to ensure every dashboard-owned API imports the helper instead of raw `getSessionAdmin()`.
- Add a regression test for the exact `admin` role behavior: `["admin"]` and `["admin", "priest"]` allowed; `["priest"]`, `["committee_member"]`, `["volunteer"]`, `["devotee"]`, and `[]` denied.

### Non-Goals

- Do not build tenant member management UI or APIs in this story.
- Do not implement super-admin tenant provisioning, temple listing, role governance, or role assignment routes.
- Do not revive `admin_users`, `requireLegacyTenantSuperAdmin()`, or tenant-local super-admin semantics.
- Do not block Firebase phone OTP/session creation for marker-only memberships inside `/api/auth/session`; the dashboard/API layer owns the `admin` permission denial.
- Do not implement capability sets beyond the hard V0 `admin` dashboard-access check.
- Do not add tenant switching, generic-host tenant picker, public signup, billing, approval queues, impersonation, tenant deletion, or WhatsApp linkage management.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.5-Enforce-Role-Based-Tenant-Dashboard-Access]
- [Source: _bmad-output/planning-artifacts/epics.md#Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-1---Super-admins-are-separate-from-tenant-members-ADOPTED]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-3---Tenant-identity-is-server-derived-except-in-super-admin-routes-ADOPTED]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-12---Person-identity-is-global-membership-and-roles-are-tenant-scoped]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-18---V0-role-seeds-and-capabilities-are-fixed]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-6---Guardrails-And-Tests]
- [Source: _bmad-output/implementation-artifacts/1-4-tenant-login-resolves-membership-by-subdomain.md#Previous-Story-Intelligence]
- Latest documentation references checked on 2026-07-18: Next.js `cookies()` API, Next.js redirect guide, and Firebase Admin ID-token verification.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- lib/auth/tenant-admin.test.ts app/api/events/route.test.ts app/api/tenant-dashboard-auth-boundary.test.ts` - RED failed as expected: missing `lib/auth/tenant-admin` helper and API routes still imported raw `getSessionAdmin()`.
- `npm run test -- lib/auth/tenant-admin.test.ts app/api/events/route.test.ts app/api/tenant-dashboard-auth-boundary.test.ts` - passed, 3 files / 14 tests.
- `npm run test` - passed, 34 files / 207 tests.
- `npm run typecheck` - initially failed on test-only narrowing for `tenantAdminAuthResponse()`, then passed after narrowing assertion.
- `npm run lint` - passed.
- `npm run test` - final regression passed, 34 files / 207 tests.
- `npm run test -- lib/auth/tenant-admin.test.ts app/api/events/route.test.ts app/api/tenant-dashboard-auth-boundary.test.ts` - review patches passed, 3 files / 16 tests.
- `npm run typecheck` - review patches passed.
- `npm run lint` - review patches passed.
- `npm run test` - review patches passed, 34 files / 209 tests.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added `requireTenantAdminSession()` with live membership session loading, exact V0 `admin` role enforcement, and stable `401`/`403` denial responses.
- Gated dashboard layout and root redirect with the tenant-admin helper; missing tenant session redirects to login, active non-admin membership uses Next forbidden handling.
- Updated all dashboard-owned tenant API routes to use tenant-admin authorization while preserving server-derived `session.tenantId` and existing validation/conflict behavior.
- Added helper, representative route, and static boundary tests covering admin allowed, marker-only roles denied, no super-admin fallback, and no client-supplied tenant ID source.
- Manual Firebase login was not run because no local Firebase/Auth emulator or configured live Firebase flow was available in this validation pass.
- Review fixes completed: dashboard leaf pages now re-run tenant-admin authorization through `requireDashboardAdmin()`, and static boundary tests now cover the centralized helper plus dashboard pages.

### Change Log

- 2026-07-18: Implemented Story 1.5 tenant dashboard role enforcement and moved story to review.
- 2026-07-18: Resolved code review findings and moved story to done.

### File List

- app/(dashboard)/layout.tsx
- app/(dashboard)/dashboard/chatbot-settings/page.tsx
- app/(dashboard)/dashboard/devotees/[id]/page.tsx
- app/(dashboard)/dashboard/devotees/page.tsx
- app/(dashboard)/dashboard/donations/page.tsx
- app/(dashboard)/dashboard/events/page.tsx
- app/(dashboard)/dashboard/page.tsx
- app/(dashboard)/dashboard/require-dashboard-admin.ts
- app/(dashboard)/dashboard/whatsapp-activity/page.tsx
- app/api/devotees/[id]/donations/route.ts
- app/api/devotees/[id]/route.ts
- app/api/devotees/route.ts
- app/api/donations/[id]/route.ts
- app/api/donations/route.ts
- app/api/events/[id]/announce/route.ts
- app/api/events/[id]/route.ts
- app/api/events/route.test.ts
- app/api/events/route.ts
- app/api/temple-faqs/[id]/route.ts
- app/api/temple-faqs/route.ts
- app/api/temple-sevas/[id]/route.ts
- app/api/temple-sevas/route.ts
- app/api/temple-social-links/[platform]/route.ts
- app/api/temple-special-days/[id]/route.ts
- app/api/temple-special-days/route.ts
- app/api/tenant-dashboard-auth-boundary.test.ts
- app/api/tenant/route.ts
- app/forbidden.tsx
- app/page.tsx
- lib/auth/tenant-admin.test.ts
- lib/auth/tenant-admin.ts
- next.config.ts
