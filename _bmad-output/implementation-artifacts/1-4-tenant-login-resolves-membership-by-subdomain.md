---
baseline_commit: 2ad9082
story_generation_note: "Explicitly requested as Story 1.4 using bmad-agent-dev and bmad-create-story."
created_at: 2026-07-18T19:38:06+0530
---

# Story 1.4: Tenant Login Resolves Membership By Subdomain

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tenant admin,
I want login to resolve my temple from the subdomain and my membership from my phone number,
so that I only enter the intended temple dashboard.

## Acceptance Criteria

1. Given a user starts tenant login from an active tenant hostname, when Firebase phone OTP succeeds and the backend verifies the Firebase ID token, then the backend resolves `tenant_id` from `tenant_domains.hostname`, and it creates a tenant session only if the normalized phone maps to a `person` with an active membership in that tenant.
2. Given the same person belongs to multiple temples, when the person logs in from one temple subdomain, then the tenant session is created only for the tenant resolved from that hostname, and no client-supplied tenant selector is trusted.
3. Given a user starts login from `trytempleos.com`, `www.trytempleos.com`, or another generic host, when tenant login is attempted, then no tenant session is created, and the user receives a clear invalid-tenant-context response.
4. Given local development uses a tenant host override, when the app runs outside production, then the override can resolve the intended tenant for local testing, and the override is disabled or rejected in production.

## Tasks / Subtasks

- [x] Add tenant-domain repository lookup. (AC: 1, 2, 3, 4)
  - [x] Create [lib/db/tenant-domains.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/tenant-domains.ts).
  - [x] Reuse [lib/tenant-domains.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/tenant-domains.ts) `normalizeTenantHostname(raw)` for hostname parsing; do not create another parser.
  - [x] Add `getActiveTenantDomainByHostname(hostname)` or `getTenantByHostname(hostname)` that reads only `tenant_domains.status = 'active'`.
  - [x] Return the mapped `TenantDomain` and enough tenant context for session creation, or return `null` for inactive/missing/generic hosts.
  - [x] Keep SQL parameterized and isolated in the repository module.

- [x] Add person + tenant-membership login repository helpers. (AC: 1, 2)
  - [x] Create [lib/db/persons.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/persons.ts) with `findPersonByPhone(phoneNumber)`, `getPersonById(personId)`, and Firebase UID compare/bind behavior.
  - [x] Create [lib/db/tenant-memberships.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/tenant-memberships.ts) with `findActiveTenantMembershipByPersonAndTenant({ personId, tenantId })`.
  - [x] Include role codes for the membership session by joining `tenant_membership_roles` to active `role_definitions`.
  - [x] Do not create `persons` or memberships from tenant login in this story. Login is authorization against already-provisioned identity data; Story 2 owns provisioning and Story 3/4 owns explicit member management.
  - [x] Normalize phones with [lib/phone.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/phone.mts) before lookup.

- [x] Update tenant session payload and helpers. (AC: 1, 2)
  - [x] Update [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts) so tenant sessions carry `{ tenantId, personId, membershipId, roles, phoneNumber, displayName, exp }`.
  - [x] Remove `adminId` from newly issued tenant session payloads; legacy `admin_users` is not the forward auth source.
  - [x] Keep the cookie name `templeos_session` and 7-day max age unless the user explicitly changes session duration.
  - [x] Preserve `createSignedSessionToken()` / `verifySignedSessionToken()` from [lib/auth/session-token.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session-token.ts); do not add JWT or auth-session libraries.
  - [x] Ensure the session type guard rejects tenant-shaped tokens missing `personId`, `membershipId`, or `roles`.

- [x] Replace tenant login exchange with subdomain + membership resolution. (AC: 1, 2, 3, 4)
  - [x] Update [app/api/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts).
  - [x] Verify `{ idToken }` with [lib/firebase/admin.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/firebase/admin.ts) before trusting `decoded.uid` or claims.
  - [x] Validate `decoded.phone_number` is a string before normalizing; missing or non-string phone claims return `401`.
  - [x] Resolve the request hostname from the server request, not from request body JSON. Do not accept `tenantId`, `tenantSlug`, `hostname`, or similar client-supplied tenant selectors.
  - [x] Reject apex/generic hosts such as `trytempleos.com`, `www.trytempleos.com`, `localhost` without a safe local override, and missing/invalid hosts with `400` or `403` and a stable code such as `INVALID_TENANT_CONTEXT`.
  - [x] In non-production only, support one explicit local override environment variable for the tenant host, for example `TEMPLEOS_LOCAL_TENANT_HOST`. If `NODE_ENV === "production"` and the override is present, reject session creation rather than silently using it.
  - [x] On success, bind `persons.firebase_uid` on first login when it is `NULL`; reject a different existing Firebase UID with `403` and do not overwrite.
  - [x] Set only the tenant session cookie on success. Do not read, set, clear, or depend on `templeos_super_admin_session`.

- [x] Preserve login UI and current dashboard flow. (AC: 1, 3)
  - [x] Keep [app/(auth)/login/page.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/(auth)/login/page.tsx) posting only `{ idToken }` to `/api/auth/session`.
  - [x] Do not add a visible tenant picker or any generic-host tenant selection UI; generic tenant picker is explicitly deferred.
  - [x] For `INVALID_TENANT_CONTEXT`, show a clear sign-in failure message or route to the existing access-denied page. Avoid exposing internal tenant/domain table details.

- [x] Leave role enforcement for Story 1.5. (AC: 1, 2)
  - [x] Story 1.4 should include role codes in the session so Story 1.5 can authorize dashboard access.
  - [x] Do not deny dashboard login merely because the role is not `admin` unless the acceptance criteria are intentionally expanded. Story 1.5 owns V0 `admin` role enforcement.
  - [x] Do not convert tenant-local admin-management routes to membership management in this story; Story 1.5 and later tenant-member stories own that cutover.

- [x] Add focused tests. (AC: 1, 2, 3, 4)
  - [x] Add tenant-domain repository tests for active hostname hit, inactive hostname miss, missing hostname miss, lowercase normalized lookup, and generic host rejection if handled in the repository.
  - [x] Add person repository tests for normalized phone lookup, Firebase UID first-bind, same-UID idempotence, and UID mismatch rejection.
  - [x] Add tenant-membership repository tests for active membership hit by `personId + tenantId`, cross-tenant miss, inactive membership miss, and role-code loading.
  - [x] Add route-handler tests for successful tenant login, same person in two tenants resolving only the request host tenant, generic/apex host denial, local override allowed in non-production, local override rejected in production, non-string phone claim denial, Firebase token denial, and missing membership denial.
  - [x] Add regression assertions that [app/api/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts) no longer imports [lib/db/admin-users.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/admin-users.ts) or calls `findActiveAdminByPhone()`.

- [x] Verify implementation. (AC: 1, 2, 3, 4)
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.
  - [x] If a local Firebase/Auth emulator or real configured Firebase project is available, manually verify tenant login from a configured tenant hostname and one generic host.

### Review Findings

- [x] [Review][Patch] Fresh local environments cannot create the forward tenant-login data shape [app/api/auth/session/route.ts:42](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts:42)
- [x] [Review][Patch] Disable or remove the stale legacy `admin_users` admin-management surface [app/api/admins/route.ts:8](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/route.ts:8)
- [x] [Review][Defer] Tenant host trust boundary is underspecified [app/api/auth/session/route.ts:112](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts:112) — deferred to deployment/domain hardening per user decision 3.2
- [x] [Review][Patch] Deactivated memberships can still use tenant APIs until cookie expiry [app/api/devotees/route.ts:8](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/devotees/route.ts:8)
- [x] [Review][Patch] Firebase UID is mutated before active tenant membership is authorized [app/api/auth/session/route.ts:60](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts:60)
- [x] [Review][Patch] `persons.firebase_uid` needs database uniqueness to avoid concurrent first-login binding races [migrations/001_initial_schema.sql:30](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/001_initial_schema.sql:30)
- [x] [Review][Patch] Role codes are trusted as arbitrary strings before being embedded in the session [lib/auth/session.ts:67](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts:67)
- [x] [Review][Patch] Production local-host override rejection does not log the required developer-facing config error [app/api/auth/session/route.ts:107](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts:107)

## Dev Notes

### Controlling Context

- Use [_bmad-output/planning-artifacts/epics.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/epics.md) as the controlling story source for Story 1.4.
- Use [_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md) and [_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md) as the governing architecture for the Super Admin / forward identity slice.
- The older PRD says the MVP has no Super Admin dashboard and one seeded pilot tenant. For Story 1.4, those points are superseded by the Super Admin architecture and epics for FR-025 through FR-043.
- Story 1.4 owns tenant login source-of-truth replacement only: host -> `tenant_domains`, phone -> `persons`, authorization context -> active `tenant_memberships`, session -> membership payload.
- Story 1.5 owns V0 `admin` dashboard access enforcement. Do not overbuild that into Story 1.4.

### Current State To Modify

- [app/api/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts) currently verifies Firebase ID tokens, casts `decoded.phone_number`, looks up `admin_users` through `findActiveAdminByPhone()`, updates `admin_users.firebase_uid`, and sets a tenant session with `adminId` and `tenantId`.
- [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts) currently signs `templeos_session` with `{ adminId, tenantId, phoneNumber, displayName, exp }`. It also exports `requireLegacyTenantSuperAdmin()` for old tenant-local admin-management routes; do not confuse this with platform super-admin auth.
- [lib/tenant-domains.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/tenant-domains.ts) already normalizes hostnames by trimming, lowercasing, stripping scheme/path/query/port through `URL`, rejecting IP-like and malformed hostnames, and returning `null` for invalid input.
- [types/db.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/types/db.ts) already has forward types for `Person`, `TenantDomain`, `TenantMembership`, `TenantMembershipRole`, `RoleCode`, and `RoleDefinition`.
- [migrations/001_initial_schema.sql](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/001_initial_schema.sql) already creates `persons`, `tenant_domains`, `tenant_memberships`, and `tenant_membership_roles`. It does not create `admin_users`.
- [lib/db/persons.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/persons.ts), [lib/db/tenant-domains.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/tenant-domains.ts), and [lib/db/tenant-memberships.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/tenant-memberships.ts) do not exist yet and should be added rather than hiding SQL in the route.
- [app/(auth)/login/page.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/(auth)/login/page.tsx) is a client-side Firebase phone OTP page and already posts only `{ idToken }` to `/api/auth/session`; the route must infer tenant context server-side.

### Architecture Compliance

- AD-3: tenant dashboard APIs and tenant login must derive tenant identity server-side. Only super-admin-authorized APIs may accept explicit tenant IDs.
- AD-10: tenant-owned repository helpers must include scope in names/signatures unless they are explicit global lookup functions needed for login. Acceptable global lookups here are `findPersonByPhone()` and tenant-domain lookup by hostname.
- AD-12: person identity is global; memberships and roles are tenant-scoped. The same person can have different roles in different temples.
- AD-14: temple-owned login starts with `tenant_domains.hostname`; Firebase phone OTP proves the person; `tenant_memberships` plus roles determine tenant context.
- AD-16: tenant sessions carry `{ tenantId, personId, membershipId, roles, exp }`; new login must not depend on `admin_users`.
- AD-19: `tenant_domains.hostname` stores full normalized hostnames like `svtemple.trytempleos.com`; apex/generic hosts such as `trytempleos.com` and `www.trytempleos.com` do not create tenant sessions; local overrides must not run in production.

### Tenant Login Algorithm

1. Parse JSON body and validate `{ idToken: string }`.
2. Verify Firebase ID token with `verifyFirebaseIdToken(idToken)`.
3. Require `typeof decoded.phone_number === "string"` and normalize it with `normalizePhoneNumber()`.
4. Resolve the effective request host from server-controlled request headers. Prefer `req.nextUrl.hostname` / `Host` header behavior consistent with Next route handlers; never accept a body-provided tenant selector.
5. Normalize that host with `normalizeTenantHostname()`.
6. If the normalized host is generic/apex/invalid, return a stable invalid-tenant-context response and issue no session cookie.
7. If a non-production local override env var is configured, normalize and use that override as the tenant host. If production and the override is set, reject login and log a developer-facing configuration error.
8. Look up an active `tenant_domains` row by normalized host. If missing, return invalid tenant context and issue no cookie.
9. Find a `person` by normalized phone. If missing, return `403 NOT_AUTHORIZED` and issue no cookie.
10. Compare/bind `persons.firebase_uid`: bind when null, allow when equal, reject when different.
11. Look up active `tenant_memberships` by `personId + tenantId` and load role codes. If missing, return `403 NOT_AUTHORIZED` and issue no cookie.
12. Set the tenant session payload with `tenantId`, `personId`, `membershipId`, `roles`, `phoneNumber`, and `displayName`.

### Local Host Override Guardrail

- Use exactly one override knob and document it in code/tests, for example `TEMPLEOS_LOCAL_TENANT_HOST`.
- The override value should be a hostname or URL accepted by `normalizeTenantHostname()`.
- The override is allowed only when `NODE_ENV !== "production"`.
- If `NODE_ENV === "production"` and the override is non-empty, reject the login attempt. Do not ignore the override silently; silent success can hide a dangerous production misconfiguration.
- Do not use the override to bypass membership lookup. It only supplies tenant-host context for local development.

### Error Contract

- Invalid JSON or invalid `{ idToken }` body: `400`.
- Firebase ID token verification failure: `401`.
- Missing or non-string Firebase phone claim: `401`.
- Invalid, generic, unknown, inactive, or production-rejected tenant context: use a clear invalid-context response, preferably `400` with `code: "INVALID_TENANT_CONTEXT"` unless surrounding route tests establish a better convention.
- Known tenant context but no active person/membership authorization: `403` with `code: "NOT_AUTHORIZED"`.
- Firebase UID mismatch on an existing person: `403` with `code: "NOT_AUTHORIZED"`.
- On every denial path, do not issue a tenant session cookie.

### Library / Framework Requirements

- Use the repo's current stack from [package.json](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/package.json): Next.js `16.2.10`, React `19.2.4`, Firebase JS SDK `^12.16.0`, Firebase Admin SDK `^14.2.0`, `pg` `^8.22.0`, Zod `^4.4.3`, TypeScript `^5`, and Vitest `^4.1.10`.
- Latest docs checked on 2026-07-18:
  - Next `cookies()` is async and cookie mutation is supported in Route Handlers or Server Functions, not Server Component render paths.
  - Firebase Admin `verifyIdToken()` verifies and decodes client ID tokens; after verification, the backend may use `uid` and trusted claims such as phone identity.
  - Firebase Web phone auth still uses `signInWithPhoneNumber()` with `RecaptchaVerifier`; on send failure, reset reCAPTCHA before retry. The current login page already follows this pattern.
- Do not add Prisma, Drizzle, NextAuth/Auth.js, JWT libraries, or new cookie/session dependencies for this story.

### Testing Notes

- Follow current Vitest style: repository tests mock [lib/db/pool.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/pool.ts); route-handler tests should mock `verifyFirebaseIdToken()`, repository helpers, and `cookies()`.
- There is no current [app/api/auth/session/route.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.test.ts); add it for this story rather than relying only on token helper tests.
- Existing [lib/auth/session.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.test.ts) covers token round trip/tamper/malformed/expiry and the 7-day lifetime. Extend it for the new payload shape and type-guard rejection of old `adminId` tokens.
- Existing [lib/tenant-domains.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/tenant-domains.test.ts) covers normalization. Add tests for generic/apex host policy either there or in a small resolver helper used by the route.
- Add static regression tests only where useful. The high-value guard is proving the tenant auth route no longer imports `admin-users.ts` or `findActiveAdminByPhone()`.

### Previous Story Intelligence

- Story 1.1 created the forward identity reset schema and removed `admin_users` from the migration chain as an auth source.
- Story 1.2 seeded fixed V0 role definitions and first `super_admins`, and deliberately did not create tenant memberships for super-admin bootstrap.
- Story 1.3 implemented separate `templeos_super_admin_session`, live `requireSuperAdmin()` backed only by `super_admins`, and a safe `/api/super-admin/me` proof route.
- Story 1.3 intentionally left tenant login on the legacy `admin_users` path; this story owns that replacement.
- Story 1.3 review hardened signed session tokens to reject extra dot-separated segments, validated runtime Firebase phone claims, avoided personal-looking test fixtures, and kept tenant and super-admin cookies separate. Preserve those patterns.

### Git Intelligence

- Recent relevant commit: `2ad9082 Implement super admin phone OTP session`.
- Recent pattern: add small repository helpers with row mappers, route handlers with stable response codes, mocked Vitest route/repository tests, then run `npm run test`, `npm run typecheck`, and `npm run lint`.
- Current checkout is clean at story creation time.

### Non-Goals

- Do not build `/super-admin` UI, tenant list, temple provisioning API, tenant provisioning service, role management API, or CLI provisioning.
- Do not create public signup, tenant picker, tenant switching, billing, approval queue, tenant deletion, tenant transfer, impersonation, data export, custom domains, or Meta embedded signup.
- Do not use `getPilotTenant()` in the new tenant login path.
- Do not retain `admin_users` as a fallback auth source for `/api/auth/session`.
- Do not allow super-admin cookies to create tenant sessions.
- Do not enforce role capability access for dashboard routes yet; Story 1.5 owns admin-role gating.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.4-Tenant-Login-Resolves-Membership-By-Subdomain]
- [Source: _bmad-output/planning-artifacts/epics.md#Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-3---Tenant-identity-is-server-derived-except-in-super-admin-routes]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-12---Person-identity-is-global-membership-and-roles-are-tenant-scoped]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-14---Temple-owned-login-resolves-tenant-by-subdomain]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-16---Clean-DB-reset-starts-from-the-forward-schema]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-19---Tenant-domain-stores-full-normalized-hostnames]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-5---Tenant-Member-Role-Management]
- [Source: _bmad-output/implementation-artifacts/1-3-super-admin-phone-otp-session.md#Previous-Story-Intelligence]
- Latest documentation references checked on 2026-07-18: Next.js `cookies()` API, Firebase Admin ID-token verification, and Firebase Web phone auth.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- lib/db/tenant-domains.test.ts lib/db/persons.test.ts lib/db/tenant-memberships.test.ts lib/auth/session.test.ts app/api/auth/session/route.test.ts app/api/auth/auth-boundary.test.ts` - failed in RED phase: missing forward repository modules and legacy `/api/auth/session` import of `admin-users`.
- `npm run test -- lib/db/tenant-domains.test.ts lib/db/persons.test.ts lib/db/tenant-memberships.test.ts lib/auth/session.test.ts app/api/auth/session/route.test.ts app/api/auth/auth-boundary.test.ts` - passed, 6 files / 26 tests.
- `npm run typecheck` - passed.
- `npm run test` - passed, 30 files / 186 tests.
- `npm run lint` - passed.
- `npm run test -- lib/auth/session.test.ts lib/auth/session-live.test.ts lib/db/persons.test.ts lib/db/tenant-memberships.test.ts app/api/auth/session/route.test.ts migrations/identity-schema.test.ts scripts/seed-bootstrap.test.ts app/api/auth/auth-boundary.test.ts app/api/super-admin/auth-boundary.test.ts` - review patches passed, 9 files / 39 tests.
- `npm run typecheck` - review patches passed.
- `npm run lint` - review patches passed.
- `npm run test` - review patches passed, 31 files / 193 tests.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added forward tenant-domain, person, and tenant-membership repository helpers with mocked DB coverage.
- Replaced `/api/auth/session` legacy `admin_users` lookup with server-derived hostname resolution, Firebase phone verification, `persons` lookup, active membership lookup, Firebase UID compare/bind, and membership-shaped tenant session issuance.
- Updated tenant sessions to carry `tenantId`, `personId`, `membershipId`, `roles`, `phoneNumber`, `displayName`, and `exp`; newly issued sessions no longer include `adminId`.
- Updated dashboard live-session check and existing author fields to use `membershipId`, preserving role enforcement for Story 1.5.
- Added route, repository, session, and static boundary tests covering AC 1-4.
- Review fixes completed: local `seed:admin` now seeds forward identity data, stale memberships are live-checked by `getSessionAdmin()`, legacy admin-management endpoints are retired with `410`, Firebase UID binding happens only after active membership authorization, `persons.firebase_uid` is uniquely indexed, role codes are validated against the V0 vocabulary, and production local-host override rejection logs a config-specific message.
- Manual Firebase login was not run because no local Firebase/Auth emulator or configured live Firebase flow was available in this validation pass.

### File List

- [app/(dashboard)/layout.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/(dashboard)/layout.tsx)
- [app/(dashboard)/dashboard/admins/page.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/(dashboard)/dashboard/admins/page.tsx)
- [app/api/admins/[id]/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/[id]/route.ts)
- [app/api/admins/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/admins/route.ts)
- [app/api/auth/auth-boundary.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/auth-boundary.test.ts)
- [app/api/auth/session/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.ts)
- [app/api/auth/session/route.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/auth/session/route.test.ts)
- [app/api/donations/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/donations/route.ts)
- [app/api/events/route.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/events/route.ts)
- [app/api/super-admin/me/route.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/app/api/super-admin/me/route.test.ts)
- [features/dashboard/dashboard-shell.tsx](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/features/dashboard/dashboard-shell.tsx)
- [lib/auth/session-live.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session-live.test.ts)
- [lib/auth/session.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.test.ts)
- [lib/auth/session.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/auth/session.ts)
- [lib/db/persons.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/persons.test.ts)
- [lib/db/persons.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/persons.ts)
- [lib/db/tenant-domains.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/tenant-domains.test.ts)
- [lib/db/tenant-domains.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/tenant-domains.ts)
- [lib/db/tenant-memberships.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/tenant-memberships.test.ts)
- [lib/db/tenant-memberships.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/db/tenant-memberships.ts)
- [lib/tenant-domains.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/lib/tenant-domains.ts)
- [migrations/001_initial_schema.sql](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/001_initial_schema.sql)
- [migrations/identity-schema.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/migrations/identity-schema.test.ts)
- [scripts/seed-admin.mts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/seed-admin.mts)
- [scripts/seed-bootstrap.test.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/scripts/seed-bootstrap.test.ts)
- [types/db.ts](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/types/db.ts)
- [_bmad-output/implementation-artifacts/deferred-work.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/implementation-artifacts/deferred-work.md)
- [_bmad-output/implementation-artifacts/1-4-tenant-login-resolves-membership-by-subdomain.md](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/implementation-artifacts/1-4-tenant-login-resolves-membership-by-subdomain.md)
- [_bmad-output/implementation-artifacts/sprint-status.yaml](/Users/susanthkakarla/Documents/projects/side-projects/templeOS/_bmad-output/implementation-artifacts/sprint-status.yaml)

## Change Log

- 2026-07-18: Created Story 1.4 context for tenant login subdomain and membership resolution.
- 2026-07-18: Implemented tenant login through subdomain-derived tenant context, global person identity, active tenant membership lookup, membership-shaped session payload, and focused guardrail tests.
- 2026-07-18: Applied code-review patches and moved Story 1.4 to done; deferred tenant host trust-boundary hardening per user decision.
