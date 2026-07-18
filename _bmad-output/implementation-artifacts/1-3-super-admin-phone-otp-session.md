---
baseline_commit: 60a33cb
story_generation_note: "Explicitly requested as Story 1.3 using bmad-agent-dev and bmad-create-story."
created_at: 2026-07-18T17:32:34+0530
---

# Story 1.3: Super Admin Phone OTP Session

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a super admin,
I want to log in with phone OTP using a separate super-admin session,
so that I can access platform controls without being confused with a tenant member.

## Acceptance Criteria

1. Given a phone number belongs to an active `super_admins` row, when Firebase phone OTP succeeds and the backend verifies the Firebase ID token, then the backend creates a super-admin session payload containing `superAdminId`, `phoneNumber`, `displayName`, and `exp`, and the session uses a cookie name distinct from tenant dashboard sessions.
2. Given a phone number does not belong to an active `super_admins` row, when Firebase phone OTP succeeds, then super-admin login is denied, and no super-admin session cookie is issued.
3. Given a user has only a tenant membership with the `admin` role, when the user calls a super-admin-protected route, then `requireSuperAdmin()` rejects the request, and tenant role membership is not treated as platform authorization.
4. Given a request has no valid super-admin session, when it calls a super-admin route, then the route returns `401`, and authenticated users without super-admin privilege receive `403`.

## Tasks / Subtasks

- [x] Add super-admin session token helpers. (AC: 1, 3, 4)
  - [x] Create [lib/auth/super-admin-session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/super-admin-session.ts).
  - [x] Define `SuperAdminSessionPayload` exactly as `{ superAdminId: string; phoneNumber: string; displayName: string; exp: number }`.
  - [x] Use a cookie name distinct from `templeos_session`, for example `templeos_super_admin_session`.
  - [x] Reuse the existing HMAC token pattern from [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts), or extract a small shared [lib/auth/session-token.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session-token.ts) if that reduces duplication without changing tenant-session behavior.
  - [x] Set cookie options consistent with current session cookies: `httpOnly: true`, `secure` only in production, `sameSite: "lax"`, `path: "/"`, 30-day `maxAge`.
  - [x] Export helpers to create, verify, set, read, and clear only super-admin sessions.

- [x] Add live super-admin authorization guard. (AC: 3, 4)
  - [x] Export `requireSuperAdmin()` from [lib/auth/super-admin-session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/super-admin-session.ts).
  - [x] `requireSuperAdmin()` must read only the super-admin cookie and must not authorize from `templeos_session`, `admin_users.role`, `tenant_memberships`, or tenant role codes.
  - [x] Re-read the `super_admins` row on every guarded request, mirroring the live-status check pattern in [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts).
  - [x] Reject inactive or missing super-admin rows even if the cookie token is otherwise valid.
  - [x] Provide enough guard state for routes to return `401` for missing/invalid super-admin session and `403` when a tenant-authenticated user lacks platform authorization.

- [x] Extend the super-admin repository for login. (AC: 1, 2, 3)
  - [x] Add `findActiveSuperAdminByPhone(phoneNumber)` to [lib/db/super-admins.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/super-admins.ts).
  - [x] Add `getSuperAdminById(id)` to support live session revalidation.
  - [x] Add `setSuperAdminFirebaseUid(superAdminId, firebaseUid)` or a compare-and-bind helper.
  - [x] Normalize phone numbers with [lib/phone.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/phone.mts) before DB lookup; do not create another phone parser.
  - [x] Bind `firebase_uid` on first successful login when it is `NULL`.
  - [x] If `firebase_uid` is already set and differs from `decoded.uid`, reject login and do not overwrite it. Account recovery/rebinding is out of scope.

- [x] Add the super-admin Firebase token exchange route. (AC: 1, 2, 4)
  - [x] Create [app/api/super-admin/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/super-admin/auth/session/route.ts).
  - [x] Accept `{ idToken: string }` and validate it with Zod, matching [app/api/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts).
  - [x] Verify the ID token with [lib/firebase/admin.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/firebase/admin.ts).
  - [x] Require a `phone_number` claim, normalize it, and match only active `super_admins.phone_number`.
  - [x] On success, set only the super-admin session cookie. Do not set, reuse, or depend on `templeos_session`.
  - [x] On unauthorized phone, return `403` with a stable `NOT_AUTHORIZED` style code and issue no cookie.
  - [x] On invalid body or invalid phone claim, return `400` or `401` consistently with existing auth route behavior.
  - [x] Add `DELETE` to clear only the super-admin session cookie.

- [x] Add a minimal protected-route proof point for guard behavior. (AC: 3, 4)
  - [x] If no super-admin API route exists yet, add a small low-risk route such as [app/api/super-admin/me/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/super-admin/me/route.ts) that calls the new guard and returns the current super-admin summary.
  - [x] Return `401` when there is no valid super-admin session.
  - [x] Return `403` when only tenant/legacy dashboard authentication is present.
  - [x] Do not build `/super-admin` UI, tenant list, temple provisioning, role-management APIs, or tenant impersonation in this story.

- [x] Preserve tenant dashboard auth while isolating names. (AC: 3, 4)
  - [x] Do not rewrite tenant login to `persons` / `tenant_memberships`; that is Story 1.4.
  - [x] Do not enforce tenant role capabilities; that is Story 1.5.
  - [x] If the existing [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts) `requireSuperAdmin()` name causes import ambiguity, rename it to a legacy tenant-admin-specific name and update only current `app/api/admins/*` and dashboard-admin imports that still depend on the old `admin_users` behavior.
  - [x] Do not allow current `admin_users.role = 'super_admin'` to authorize any `app/api/super-admin/*` route.
  - [x] Preserve current tenant/dashboard pages and legacy admin-management routes until Story 1.4 and Story 1.5 replace them; changing `requireSuperAdmin()` globally without updating [app/api/admins/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/route.ts) and [app/api/admins/[id]/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/[id]/route.ts) is a regression.

- [x] Add focused tests. (AC: 1, 2, 3, 4)
  - [x] Add token tests for super-admin session round trip, tampering, malformed tokens, expiry, and distinct cookie name.
  - [x] Add a regression test proving a tenant-shaped token with `{ adminId, tenantId, ... }` cannot verify as a super-admin token.
  - [x] Add repository tests for active lookup by normalized phone, lookup by ID, Firebase UID first-bind, and Firebase UID mismatch rejection.
  - [x] Add route-handler tests for successful token exchange, unallowlisted phone denial, missing phone claim, invalid ID token, and cookie clearing.
  - [x] Add guard tests proving a tenant/legacy session does not satisfy super-admin authorization.
  - [x] Keep tests compatible with Vitest's Node environment and mocked `cookies()`, `verifyFirebaseIdToken()`, and `getPool().query`; do not require live Firebase or live Postgres.

- [x] Verify implementation. (AC: 1, 2, 3, 4)
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.
  - [ ] If a local Firebase/Auth emulator or real configured Firebase project is available, manually verify the exchange flow with a seeded active super-admin phone.

### Review Findings

- [x] [Review][Patch] Validate `decoded.phone_number` is a string before DB lookup; the current cast can send a non-string claim into `normalizePhoneNumber()` and produce a 500 instead of a 401/403 denial. [app/api/super-admin/auth/session/route.ts:32]
- [x] [Review][Patch] Reject signed session tokens with extra dot-separated segments; `payload.signature.extra` currently verifies because only the first two split parts are used. [lib/auth/session-token.ts:36]
- [x] [Review][Patch] Prevent one Firebase UID from being bound to multiple active super-admin rows; `bindSuperAdminFirebaseUid()` only checks the target row today. [lib/db/super-admins.ts:82]
- [x] [Review][Patch] Return a safe `/api/super-admin/me` summary instead of the full `SuperAdmin` object, which includes `firebaseUid` and internal timestamps. [app/api/super-admin/me/route.ts:9]
- [x] [Review][Patch] Remove the legacy/platform guard name collision or strengthen route-boundary tests; `lib/auth/session.ts` and `lib/auth/super-admin-session.ts` both export `requireSuperAdmin()`, and the boundary test does not block importing the legacy tenant session module. [lib/auth/session.ts:73]
- [x] [Review][Patch] Add direct tests that `requireSuperAdmin()` rejects missing and inactive `super_admins` rows after live DB re-read. [lib/auth/super-admin-session.test.ts:17]
- [x] [Review][Patch] Add missing/non-string phone-claim route coverage and replace personal-looking phone/name fixtures with clearly generic test data. [app/api/super-admin/auth/session/route.test.ts:31]

## Dev Notes

### Controlling Context

- Use [_bmad-output/planning-artifacts/epics.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/epics.md) and [_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md) as controlling sources for Story 1.3.
- Story 1.3 owns super-admin session creation and guard behavior only. Story 1.4 owns tenant subdomain membership login. Story 1.5 owns tenant dashboard role enforcement.
- The older MVP PRD is stale for Super Admin scope; the Super Admin architecture and epics supersede it for FR-025 through FR-043.

### Current State To Modify

- [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts) currently signs `templeos_session` with payload `{ adminId, tenantId, phoneNumber, displayName, exp }` and has a legacy `requireSuperAdmin()` that re-reads `admin_users`.
- [app/api/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts) currently verifies Firebase ID tokens, reads `decoded.phone_number`, finds `admin_users` by phone, writes `admin_users.firebase_uid`, and sets the tenant dashboard cookie.
- [lib/db/super-admins.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/super-admins.ts) currently supports first-super-admin bootstrap only. It needs read/bind helpers for login and live guard checks.
- [lib/phone.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/phone.mts) already normalizes phone numbers and was recently corrected to use the default `libphonenumber-js` export plus `{ defaultCountry }`. Reuse this path.
- [lib/firebase/admin.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/firebase/admin.ts) already wraps Firebase Admin `verifyIdToken()`.
- [app/(auth)/login/page.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/(auth)/login/page.tsx) is the tenant/admin phone OTP UI and posts to `/api/auth/session`. Do not repurpose it in a way that starts setting super-admin cookies for tenant login.
- There are no current `app/api/super-admin/*` routes. Add only the minimal auth/session route and, if useful for AC coverage, a minimal `/api/super-admin/me` proof route.
- [app/api/admins/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/route.ts) and [app/api/admins/[id]/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/[id]/route.ts) currently import the legacy `requireSuperAdmin()` from [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts). Do not accidentally convert tenant-local admin-management behavior into platform Super Admin behavior in this story.

### Architecture Compliance

- AD-1: super-admins are separate from tenant members. Super-admin authorization must come from `super_admins`, not `admin_users`, `persons`, `tenant_memberships`, or role assignments.
- AD-3: only super-admin-authorized routes may accept explicit tenant IDs. This story should not add tenant-ID-taking routes except a minimal protected proof endpoint if needed.
- AD-8: super-admins authenticate with Firebase phone OTP against `super_admins.phone_number`; V0 super-admins are all equal; session payload is `{ superAdminId, phoneNumber, displayName, exp }`; cookie name is distinct from tenant sessions.
- AD-16: the forward reset schema does not include `admin_users` as auth source. Do not build new super-admin behavior on the legacy table.
- Error convention: validation errors return `400`, missing or invalid sessions return `401`, authenticated but insufficient privilege returns `403`.

### Firebase UID Binding Rule

- The first successful super-admin login should populate `super_admins.firebase_uid` when it is `NULL`.
- A later successful login for the same phone and same Firebase UID should be idempotent.
- If the active `super_admins` row already has a different `firebase_uid`, deny the exchange with `403` and do not rotate the binding. A dedicated recovery/rebind flow is out of scope.
- Do not create a `person`, tenant membership, or tenant role assignment as part of super-admin login.

### Library / Framework Requirements

- Use the repo's current stack from [package.json](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/package.json): Next.js `16.2.10`, React `19.2.4`, Firebase JS SDK `^12.16.0`, Firebase Admin SDK `^14.2.0`, `pg` `^8.22.0`, Zod `^4.4.3`, TypeScript `^5`, and Vitest `^4.1.10`.
- Latest docs checked on 2026-07-18:
  - Next `cookies()` is async; cookie `.set` and `.delete` belong in Route Handlers or Server Functions, not Server Component rendering.
  - Firebase Admin `verifyIdToken()` verifies and decodes ID tokens; the backend can use `decoded.uid` and claims such as `phone_number` after verification.
  - Firebase Web phone auth still uses `signInWithPhoneNumber`; on send failure, reset/clear reCAPTCHA before retry, matching the current login page pattern.
- Do not add new auth libraries. Use existing `node:crypto`, Next `cookies()`, Firebase Admin, Zod, and `pg`.

### Testing Notes

- Existing session-token tests live in [lib/auth/session.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.test.ts). Mirror this style for super-admin token tests.
- Existing repository tests mock [lib/db/pool.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/pool.ts); follow [lib/db/super-admins.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/super-admins.test.ts).
- Existing auth route behavior is in [app/api/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts). Use route-handler tests with mocks rather than live Firebase.
- Add regression assertions that `app/api/super-admin/*` and `lib/auth/super-admin-session.ts` do not import `admin-users.ts` or use `admin_users`.

### Previous Story Intelligence

- Story 1.1 created the forward identity schema and intentionally deferred active auth/session replacement to Stories 1.2 through 1.5.
- Story 1.1 review flagged active auth still querying removed `admin_users`; Story 1.3 now owns the super-admin half of that deferred auth work.
- Story 1.2 added `super_admins` bootstrap, fixed role seeds, [lib/db/super-admins.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/super-admins.ts), and an explicit `seed:super-admin` script.
- Story 1.2 deliberately did not implement OTP login, session cookies, or `requireSuperAdmin()`; those are this story's scope.
- Story 1.2 seed CLI avoids hardcoding the real first-super-admin phone. Keep login tests equally free of personal phone numbers unless they use generic fixtures.
- A live `seed:super-admin` run in the sandbox could not reach local Postgres (`EPERM`), but the CLI path was corrected to avoid the prior `libphonenumber-js`/`tsx` startup error.

### Git Intelligence

- Recent relevant commit: `60a33cb Seed roles and first super admin`.
- That commit added the Story 1.1/1.2 artifacts, forward identity tables, role/super-admin repositories, and `seed:super-admin`.
- Current pattern is focused repository modules with row mappers, parameterized SQL, mocked `getPool().query` tests, static script guardrails, then `npm run test`, `npm run typecheck`, and `npm run lint`.

### Non-Goals

- Do not build `/super-admin` tenant list, `/super-admin/temples/new`, tenant provisioning APIs, role-definition APIs, or WhatsApp linkage APIs; those belong to Epics 2 and 3.
- Do not rewrite tenant login to subdomain + memberships; that is Story 1.4.
- Do not enforce tenant dashboard role capabilities or convert all dashboard routes to membership sessions; that is Story 1.5.
- Do not create `persons` rows for super-admin login in V0.
- Do not create a tenant membership for a super admin during login.
- Do not add public signup, tenant picker, billing, approval queue, tenant transfer, deletion, impersonation, data export, or Meta embedded signup.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.3-Super-Admin-Phone-OTP-Session]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-1---Super-admins-are-separate-from-tenant-members]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-8---Super-admin-identity-is-phone-OTP-with-no-V0-super-admin-role-hierarchy]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-1---Data-And-Auth-Spine]
- [Source: _bmad-output/implementation-artifacts/1-2-seed-v0-roles-and-first-super-admin.md#Previous-Story-Intelligence]
- Latest documentation references checked on 2026-07-18: Next.js `cookies()` API, Firebase Admin ID-token verification, and Firebase Web phone auth.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- lib/auth/session-token.test.ts lib/auth/session.test.ts lib/auth/super-admin-session.test.ts` - passed, 10 tests.
- `npm run test -- lib/db/super-admins.test.ts app/api/super-admin/auth/session/route.test.ts app/api/super-admin/me/route.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 18 tests.
- `npm run test -- app/api/super-admin/me/route.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 5 tests after hardening tenant-cookie detection.
- `npm run test -- lib/auth/session-token.test.ts lib/auth/super-admin-session.test.ts lib/db/super-admins.test.ts app/api/super-admin/auth/session/route.test.ts app/api/super-admin/me/route.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 26 tests after code-review patches.
- `npm run test` - passed, 25 files / 165 tests.
- `npm run typecheck` - passed after tightening the token-test payload guard.
- `npm run lint` - passed.

### Completion Notes List

- Implemented a shared HMAC session-token module and migrated tenant dashboard sessions to the user-approved 7-day lifetime.
- Implemented distinct super-admin session helpers using `templeos_super_admin_session` with the user-approved 24-hour lifetime.
- Added live super-admin guard backed only by `super_admins`; tenant-shaped session payloads and legacy tenant admin auth do not satisfy platform authorization.
- Added super-admin Firebase ID-token exchange and `GET /api/super-admin/me` proof route with 401/403 behavior.
- Added compare-and-bind Firebase UID helper so first login populates `super_admins.firebase_uid`, while mismatches are rejected.
- Addressed code-review findings: safe `/me` response shape, strict signed-token segment parsing, runtime Firebase phone-claim type guard, cross-row Firebase UID reuse protection, explicit legacy tenant-super-admin guard name, direct live-guard tests, and generic login fixtures.
- Manual Firebase exchange was not run because no local Firebase/Auth emulator or configured live Firebase flow was available in this validation pass.

### File List

- [app/api/super-admin/auth-boundary.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/super-admin/auth-boundary.test.ts)
- [app/api/super-admin/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/super-admin/auth/session/route.ts)
- [app/api/super-admin/auth/session/route.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/super-admin/auth/session/route.test.ts)
- [app/api/super-admin/me/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/super-admin/me/route.ts)
- [app/api/super-admin/me/route.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/super-admin/me/route.test.ts)
- [lib/auth/session-token.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session-token.ts)
- [lib/auth/session-token.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session-token.test.ts)
- [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts)
- [lib/auth/session.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.test.ts)
- [lib/auth/super-admin-session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/super-admin-session.ts)
- [lib/auth/super-admin-session.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/super-admin-session.test.ts)
- [lib/db/super-admins.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/super-admins.ts)
- [lib/db/super-admins.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/super-admins.test.ts)
- [_bmad-output/implementation-artifacts/1-3-super-admin-phone-otp-session.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/implementation-artifacts/1-3-super-admin-phone-otp-session.md)
- [_bmad-output/implementation-artifacts/sprint-status.yaml](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/implementation-artifacts/sprint-status.yaml)

## Change Log

- 2026-07-18: Created Story 1.3 context for super-admin phone OTP session and guard implementation.
- 2026-07-18: Implemented super-admin phone OTP token exchange, distinct session cookie, live guard, DB login helpers, and focused regression tests. Applied user-approved session durations: tenant dashboard 7 days, super admin 24 hours.
- 2026-07-18: Applied all code-review patch findings and moved Story 1.3 to done after tests, typecheck, and lint passed.
