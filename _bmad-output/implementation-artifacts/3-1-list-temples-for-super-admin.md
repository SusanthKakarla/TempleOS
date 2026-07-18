---
created_at: 2026-07-19T01:17:12+0530
baseline_commit: ab279417f50ac4e20029a97652602945c9d2b371
story_generation_note: "Created from bmad-create-story for explicitly requested Story 3.1, before Amelia implementation."
---

# Story 3.1: List Temples For Super Admin

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a super admin,
I want to see all provisioned temples with subdomain, admin/member, and WhatsApp status,
so that I can understand platform setup at a glance.

## Acceptance Criteria

1. Given an authenticated super admin opens `/super-admin`, when the page loads, then it fetches a protected list of provisioned temples and each row shows tenant name, normalized hostname or missing-domain state, primary/admin member summary, WhatsApp linked/unlinked status, and last updated timestamp where available.
2. Given no temples have been provisioned, when the list page loads, then the page shows an empty state and provides a path to the new temple provisioning form.
3. Given an unauthenticated user or tenant admin opens `/super-admin`, when authorization runs, then access is denied and no cross-tenant temple data is returned.
4. Given the list API is implemented, when it reads cross-tenant temple summaries, then it uses a clearly named super-admin-only repository function such as `listTenantsForSuperAdmin` and that function is not called from tenant dashboard APIs.

## Tasks / Subtasks

- [x] Add the super-admin-only tenant summary read model. (AC: 1, 4)
  - [x] Extend `lib/db/tenants.ts` with a clearly named `listTenantsForSuperAdmin()` function; do not use or expand `getPilotTenant()`.
  - [x] Return tenant ID, slug, name, normalized primary hostname or `null`, primary/admin member summary, WhatsApp linked/unlinked status, and the best available last-updated timestamp.
  - [x] Keep the query read-only and deterministic, ordered by tenant creation or updated timestamp consistently.
  - [x] Add focused tests proving the query joins/aggregates `tenants`, `tenant_domains`, `tenant_memberships`, `tenant_membership_roles`/`role_definitions`, and `whatsapp_accounts` without tenant-session input.

- [x] Add protected `GET /api/super-admin/temples` list behavior. (AC: 1, 3, 4)
  - [x] Update `app/api/super-admin/temples/route.ts` to export `GET` alongside the existing `POST`.
  - [x] Call `requireSuperAdmin()` before reading or returning any temple list data.
  - [x] Return `401` for unauthenticated users and `403` for tenant-admin-only sessions, matching the existing `POST` behavior.
  - [x] Call only `listTenantsForSuperAdmin()` for the list read; keep provisioning mutations on `provisionTemple()`.
  - [x] Add route tests for success, unauthenticated denial, tenant-admin denial, and repository failure leak-safe response.

- [x] Implement the `/super-admin` list page. (AC: 1, 2, 3)
  - [x] Add `app/(super-admin)/super-admin/page.tsx`.
  - [x] Call `requireSuperAdminPage()` before list data is fetched or rendered.
  - [x] Render a compact operational table with tenant name, hostname or missing-domain state, primary/admin member summary, WhatsApp status, and last-updated timestamp.
  - [x] Render an empty state with a link/button to `/super-admin/temples/new`.
  - [x] Reuse existing UI primitives from `components/ui/*` and lucide icons already in the project; do not add a new UI library.

- [x] Add guardrails that prevent tenant-dashboard reuse of the broad list function. (AC: 3, 4)
  - [x] Add or extend a static source test to prove `listTenantsForSuperAdmin` is not imported or called from `app/(dashboard)`, tenant APIs, or tenant session helpers.
  - [x] Include the Epic 2 retrospective action item: Epic 3 repository functions must stay explicitly super-admin-only.

- [x] Verify the story. (AC: 1, 2, 3, 4)
  - [x] Run focused tests for `lib/db/tenants.ts`, `app/api/super-admin/temples/route.ts`, the static guardrail, and any page/helper tests added for `/super-admin`.
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.
  - [x] Run `git diff --check`.

### Review Findings

- [x] [Review][Patch] Member/admin summary updates can leave the displayed last-updated timestamp stale [lib/db/tenants.ts:137]
- [x] [Review][Patch] Tenant-dashboard guardrail misses most tenant API route files [scripts/seed-bootstrap.test.ts:86]
- [x] [Review][Patch] Page guardrail does not prove authorization runs before the broad list read [scripts/seed-bootstrap.test.ts:101]
- [x] [Review][Defer] Multiple active primary domains are not detected [lib/db/tenants.ts:147] — deferred, pre-existing

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 3.1.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `IMPLEMENTATION-PLAN.md` as the governing architecture.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` is stale for this slice where it excludes Super Admin. Story 3.1 follows the July 18 Super Admin architecture and Epic 3.
- No `project-context.md` file is present in this checkout.

### Current State To Build On

- Sprint status currently has Epic 1 and Epic 2 complete, Epic 3 backlog, and Story 3.1 backlog. Story creation should move `epic-3` to `in-progress` and Story 3.1 to `ready-for-dev`.
- `app/(super-admin)/super-admin/require-super-admin.ts` already exposes `requireSuperAdminPage()` and calls `forbidden()` when `requireSuperAdmin()` returns no active super-admin session.
- `app/(super-admin)/super-admin/temples/new/page.tsx` already protects the new-temple form with `requireSuperAdminPage()` and uses the existing super-admin page visual language.
- `app/api/super-admin/temples/route.ts` currently has only `POST` provisioning. It already contains `superAdminAuthError()` that distinguishes unauthenticated `401` from tenant-admin-only `403`; reuse that for `GET`.
- `app/api/super-admin/temples/route.test.ts` already mocks `requireSuperAdmin()`, tenant session cookies, `verifySessionToken()`, and provisioning behavior. Extend this file rather than creating a parallel route-test pattern.
- `lib/db/tenants.ts` currently has `createTenantForSuperAdmin()`, historical `getPilotTenant()`, `getTenantById()`, and `updateTenant()`. Add the broad list read here with an explicit super-admin-only name.
- `lib/db/tenant-domains.ts` can create and resolve active tenant domains but does not yet list a tenant's primary domain.
- `lib/db/tenant-memberships.ts` has membership+role loading for one membership. Story 3.1 needs only a summary for each tenant; do not build full member-management APIs here.
- `lib/db/whatsapp-accounts.ts` has tenant and Meta lookup helpers plus provisioning linkage. Story 3.1 needs read-only linked/unlinked status only.
- `components/ui/table.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, and `components/ui/card.tsx` are available for the list UI.

### Architecture Compliance

- AD-1: Tenant-admin roles must never become platform-wide access. `/super-admin` and `GET /api/super-admin/temples` must require super-admin authorization.
- AD-3: Only super-admin-authorized APIs may read across tenants. Tenant dashboard APIs must derive tenant scope from tenant sessions and must not use `listTenantsForSuperAdmin()`.
- AD-4: Do not use `getPilotTenant()` for Epic 3 operations.
- AD-5 and AD-11: WhatsApp is read-only status in this story. Show linked/unlinked only; do not add transfer, disconnect, embedded signup, or self-serve WhatsApp controls.
- AD-6: No audit log is required for Story 3.1 because it is read-only. Do not add fake audit records for reads.
- AD-12 and AD-13: Person identity and roles are tenant-scoped. The member/admin summary should be derived from `tenant_memberships` plus active `role_definitions`, not from legacy `admin_users`.
- Naming: use `super-admin` for platform-wide administrators and `tenant-admin` for temple-scoped administrators. Use `tenant` in code and `temple` in user-facing copy.

### File Structure Requirements

- NEW: `app/(super-admin)/super-admin/page.tsx` for the protected list page.
- UPDATE: `app/api/super-admin/temples/route.ts` to add `GET` without disrupting existing `POST` provisioning.
- UPDATE: `app/api/super-admin/temples/route.test.ts` for protected list route tests.
- UPDATE: `lib/db/tenants.ts` for `listTenantsForSuperAdmin()` and its return type.
- NEW or UPDATE: focused tests for `lib/db/tenants.ts` and static guardrails. Prefer extending `scripts/seed-bootstrap.test.ts` if the static guardrail fits the existing production-path scan pattern.
- Do not add new dependencies, live database requirements, Firebase changes, Meta API calls, Railway config, or a Next dev server requirement.

### Testing Requirements

- Follow the current Vitest style with `vi.mock()` for route tests.
- Use official Vitest module mocking behavior: `vi.mock` is hoisted before imports, so mocks must be declared before importing the route under test. [Source: https://vitest.dev/guide/mocking/modules.html]
- Follow the Next.js Route Handler pattern: export `GET` from `app/api/super-admin/temples/route.ts` and return `NextResponse.json(...)`. [Source: https://nextjs.org/docs/app/getting-started/route-handlers]
- No `pg` transaction is needed for this read story. If tests inspect SQL, keep them at the repository boundary and do not require a live database.
- Focused verification command should include `npm run test -- lib/db/tenants.test.ts app/api/super-admin/temples/route.test.ts scripts/seed-bootstrap.test.ts` if those are the touched tests.

### Previous Story Intelligence

- Story 2.3 established the Super Admin `POST /api/super-admin/temples` authorization contract: unauthenticated users receive `401`, tenant-admin-only sessions receive `403`, and active super-admins reach the canonical service.
- Story 2.4 established `/super-admin/temples/new` as a protected server page that renders the new-temple client form after `requireSuperAdminPage()`.
- Story 2.5 established the production CLI wrapper over `provisionTemple()` and safe output patterns.
- Story 2.6 added guardrail expectations: production super-admin paths must avoid `getPilotTenant`, `admin_users`, tenant dashboard session helpers, and direct multi-table provisioning sequences outside canonical services.
- Epic 2 retrospective action item applies directly here: Epic 3 repository functions must be explicitly super-admin-only, with tests or guardrails preventing tenant dashboard imports.

### Git Intelligence

- Recent commits:
  - `ab27941 Implement provision temple CLI`
  - `dbc9389 Implement super admin new temple form`
  - `a018a63 Implement super admin temple provisioning API`
  - `b6de425 Implement temple provisioning transaction`
  - `1fa72ae Implement canonical temple provisioning contract`
- Baseline at story creation: `ab279417f50ac4e20029a97652602945c9d2b371`.
- Worktree was dirty at story creation with existing Epic 2 retrospective/status/test changes; preserve those changes and avoid reverting them.

### Latest Technical Information

- Use the repo-locked stack from `package.json`: Next.js `16.2.10`, React `19.2.4`, TypeScript, `pg` `^8.22.0`, Zod `^4.4.3`, and Vitest `^4.1.10`.
- No new library is justified for this story.
- Next.js official docs confirm App Router Route Handlers are `route.ts` files in `app`, support `GET`, and can use `NextRequest`/`NextResponse`.
- Vitest official docs confirm module mocks are transformed/hoisted so route dependencies should stay mocked before route imports.

### Non-Goals

- Do not build temple detail, temple edit, role definition governance, member role assignment, WhatsApp linkage management, tenant dashboard home metrics, tenant member management, public signup, billing, approval queues, deletion, transfer, impersonation, Meta embedded signup, WhatsApp disconnect, or tenant-owned WhatsApp self-serve setup.
- Do not revive `admin_users`.
- Do not use `getPilotTenant()` for the super-admin list.
- Do not add audit records for read-only list access.
- Do not add a new design system or dependency.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.1-List-Temples-For-Super-Admin]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Super-Admin-Temple-Operations-And-Role-Governance]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-1---Super-admin-and-tenant-admin-are-different-actors]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-3---Tenant-scope-is-derived-server-side]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#Feature-To-Architecture-Map]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-4---Super-Admin-UI/API]
- [Source: _bmad-output/implementation-artifacts/2-6-provisioning-guardrail-tests.md#Previous-Story-Intelligence]
- [Source: app/(super-admin)/super-admin/require-super-admin.ts]
- [Source: app/(super-admin)/super-admin/temples/new/page.tsx]
- [Source: app/api/super-admin/temples/route.ts]
- [Source: app/api/super-admin/temples/route.test.ts]
- [Source: lib/db/tenants.ts]
- [Source: lib/db/tenant-domains.ts]
- [Source: lib/db/tenant-memberships.ts]
- [Source: lib/db/whatsapp-accounts.ts]
- [Source: components/ui/table.tsx]
- [Source: package.json]
- [Source: https://nextjs.org/docs/app/getting-started/route-handlers]
- [Source: https://vitest.dev/guide/mocking/modules.html]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Red phase: `npm run test -- lib/db/tenants.test.ts app/api/super-admin/temples/route.test.ts scripts/seed-bootstrap.test.ts` failed as expected because `listTenantsForSuperAdmin`, `GET`, and `app/(super-admin)/super-admin/page.tsx` did not exist.
- Focused verification: `npm run test -- lib/db/tenants.test.ts app/api/super-admin/temples/route.test.ts scripts/seed-bootstrap.test.ts` - passed, 3 files / 25 tests.
- Full regression: `npm run test` - passed, 41 files / 288 tests.
- Static checks: `npm run typecheck` - passed.
- Lint: `npm run lint` - passed.
- Whitespace: `git diff --check` - passed.

### Completion Notes List

- Added `listTenantsForSuperAdmin()` in `lib/db/tenants.ts` for read-only cross-tenant summaries with primary hostname, admin/member summary, WhatsApp linked/unlinked status, and last-updated timestamp.
- Added protected `GET /api/super-admin/temples` using the existing super-admin auth boundary and stable `401`/`403`/`500` responses.
- Added `/super-admin` server page with protected list and empty states linking to `/super-admin/temples/new`.
- Added repository, route, and static guardrail tests preventing tenant-dashboard reuse of the broad super-admin list function.
- Resolved code review findings by including member and role-assignment freshness in list timestamps, scanning tenant-admin API routes broadly for super-admin list reuse, and proving `/super-admin` authorization runs before the cross-tenant read.

### File List

- `app/(super-admin)/super-admin/page.tsx`
- `app/api/super-admin/temples/route.ts`
- `app/api/super-admin/temples/route.test.ts`
- `lib/db/tenants.ts`
- `lib/db/tenants.test.ts`
- `scripts/seed-bootstrap.test.ts`
- `_bmad-output/implementation-artifacts/3-1-list-temples-for-super-admin.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-07-19: Implemented Story 3.1 super-admin temple list, protected API read, UI list/empty state, and guardrail tests.
- 2026-07-19: Addressed code review findings and marked Story 3.1 done.
