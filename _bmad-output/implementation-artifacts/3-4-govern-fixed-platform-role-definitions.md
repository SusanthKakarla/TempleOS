---
created_at: 2026-07-19T08:51:45+0530
baseline_commit: 6303137
story_generation_note: "Created from bmad-create-story through Amelia for explicitly requested Story 3.4."
---

# Story 3.4: Govern Fixed Platform Role Definitions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a super admin,
I want to view and maintain the fixed V0 platform role catalog,
so that role meanings stay consistent across temples.

## Acceptance Criteria

1. Given an authenticated super admin views role definitions, when the role catalog loads, then it shows the fixed V0 roles `admin`, `priest`, `committee_member`, `volunteer`, and `devotee` and displays each role's V0 meaning and active state.
2. Given V0 role governance is platform-owned, when tenant admins manage members, then they can assign allowed existing roles only and cannot create, rename, or redefine role codes.
3. Given a super-admin role API is implemented, when it receives a request to create custom tenant-local roles, then the request is rejected or omitted from the V0 surface and tenant-local custom roles remain deferred.
4. Given the role catalog is seeded, when role assignment logic checks permissions, then checks use stable role codes and display labels do not drive authorization.

## Tasks / Subtasks

- [x] Add a read-only role catalog repository/API surface. (AC: 1, 3, 4)
  - [x] Extend `lib/db/role-definitions.ts` with a clearly scoped read helper such as `listRoleDefinitionsForSuperAdmin()` that returns active/inactive catalog rows ordered by the fixed V0 role order.
  - [x] Keep `V0_ROLE_DEFINITIONS` as the canonical V0 role-code and capability source; do not introduce tenant-local role tables or custom role persistence.
  - [x] Add or extend `lib/db/role-definitions.test.ts` for ordering, mapping, active-state display, and stable role-code/capability behavior.
  - [x] Add `app/api/super-admin/roles/route.ts` with authenticated `GET`.
  - [x] Decide explicitly whether `POST` is omitted or returns `405`/`400` with a stable "custom roles deferred" response; cover that decision in tests.
  - [x] Return stable `401` for missing super-admin sessions and `403` for tenant-admin-only sessions before reading role definitions.
  - [x] Return a leak-safe `500` if the catalog read fails; do not expose SQL errors, stack traces, raw role rows, or tenant identifiers.

- [x] Add a visible Super Admin role catalog page. (AC: 1, 2, 3, 4)
  - [x] Add `app/(super-admin)/super-admin/roles/page.tsx` behind `requireSuperAdminPage()`.
  - [x] Fetch role definitions through `/api/super-admin/roles` or an equivalently protected server boundary consistent with existing Super Admin page patterns.
  - [x] Display role code, display label, V0 meaning/description, active state, and capability summary for all five fixed roles.
  - [x] Add navigation from the Super Admin area to the role catalog without making it look like tenant-local settings.
  - [x] Do not add create, rename, delete, deactivate, tenant override, custom-role, capability-edit, billing, impersonation, data export, WhatsApp update, disconnect, transfer, or Meta embedded signup controls.
  - [x] Use existing `components/ui/*`, `lucide-react`, and current Super Admin layout styles; do not add a UI dependency.

- [x] Preserve tenant/member role governance boundaries. (AC: 2, 3, 4)
  - [x] Prove tenant-admin member management can only use existing `RoleCode` values from `types/db.ts` and/or active `role_definitions`.
  - [x] Keep role authorization checks based on `RoleCode` values, especially `admin`, not display labels.
  - [x] Add static guardrails in `app/api/super-admin/auth-boundary.test.ts` and/or a focused role-governance test to prevent tenant dashboard code from creating, renaming, or redefining role codes.
  - [x] Carry forward the Epic 2 retrospective action item: Epic 3 repository functions must stay explicitly super-admin-only, with tests or guardrails preventing tenant dashboard imports.
  - [x] Leave tenant member role assignment mutations to Story 3.5; this story may prepare catalog data, but must not implement `PUT /api/super-admin/temples/[tenantId]/members/[membershipId]/roles`.

- [x] Verify Story 3.4. (AC: 1, 2, 3, 4)
  - [x] Run focused tests for `lib/db/role-definitions.test.ts`, the new Super Admin roles route test, and `app/api/super-admin/auth-boundary.test.ts`.
  - [x] Run any new page/helper tests if helpers are introduced.
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.
  - [x] Run `git diff --check`.

### Review Findings

- [x] [Review][Patch] Role catalog page builds internal fetch URL from request headers and forwards cookies [app/(super-admin)/super-admin/roles/page.tsx:111]
- [x] [Review][Patch] Role catalog repository can return a partial fixed V0 catalog without failing closed [lib/db/role-definitions.ts:112]
- [x] [Review][Patch] Role API auth failures can escape stable JSON error handling [app/api/super-admin/roles/route.ts:7]
- [x] [Review][Patch] Custom-role mutation deferral does not cover all mutation verbs or advertise allowed methods [app/api/super-admin/roles/route.ts:24]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 3.4.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` is stale for this slice where it conflicts with the July 18 Super Admin architecture.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `IMPLEMENTATION-PLAN.md` as the governing architecture.
- No `project-context.md` file is present in this checkout.

### Current State To Build On

- `lib/db/role-definitions.ts` already exports `V0_ROLE_DEFINITIONS` and `seedV0RoleDefinitions()`.
- `V0_ROLE_DEFINITIONS` already pins exactly these role codes: `admin`, `priest`, `committee_member`, `volunteer`, and `devotee`.
- `types/db.ts` already exports `ROLE_CODES`, `RoleCode`, `isRoleCode()`, and `RoleDefinition`.
- `lib/db/role-definitions.test.ts` already proves the fixed catalog, admin capability shape, marker roles, idempotent seeding, and rollback on seed failure.
- There is currently no `app/api/super-admin/roles/route.ts` and no `/super-admin/roles` page.
- Existing Super Admin routes use `requireSuperAdmin()` for API access and distinguish tenant-admin-only sessions with `TENANT_SESSION_COOKIE_NAME` plus `verifySessionToken()`.
- Existing Super Admin pages call `requireSuperAdminPage()` before protected reads.
- `app/api/super-admin/auth-boundary.test.ts` already contains the static guardrail style for Super Admin route and UI boundaries.

### Architecture Compliance

- AD-1: tenant-admin roles must never grant platform access. The role catalog API/page must require super-admin authorization.
- AD-3: explicit tenant IDs are acceptable only after super-admin authorization. Story 3.4 should not need a tenant ID.
- AD-5 and AD-7: public signup, billing, approval queues, tenant deletion, transfer, impersonation, and data export stay out of scope.
- AD-10: any cross-tenant or platform-owned repository read should be visibly scoped in its name, for example `listRoleDefinitionsForSuperAdmin`.
- AD-13: role definitions are platform-governed; assignments are tenant-governed. Tenant-local custom roles are deferred.
- AD-18: V0 role seeds and capabilities are fixed. Display labels can vary, but permission checks use stable role codes.
- Naming: use `super-admin` for platform-wide administrators and `tenant-admin` for temple-scoped administrators. Use `tenant` in code and `temple` in user-facing copy.

### Suggested API Contract

```ts
// GET /api/super-admin/roles
type SuperAdminRolesResponse = {
  roles: Array<{
    id: string;
    code: RoleCode;
    displayName: string;
    description: string | null;
    capabilitySet: Record<string, unknown>;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
};
```

- Recommended success response: `200` with `{ roles }`.
- Recommended auth responses: `401` `{ error: "Super Admin session required", code: "UNAUTHENTICATED" }`; `403` `{ error: "Super Admin access required", code: "FORBIDDEN" }`.
- Recommended read failure response: `500` `{ error: "Role catalog failed.", code: "ROLE_CATALOG_FAILED" }`.
- Recommended custom-role mutation response if `POST` is implemented: stable rejection such as `400` or `405` with `code: "CUSTOM_ROLES_DEFERRED"`.
- Do not accept `tenantId`, custom capability sets, display-label edits, role-code edits, active-state toggles, or tenant override payloads in Story 3.4.

### File Structure Requirements

- UPDATE: `lib/db/role-definitions.ts` for read helper and mapping reuse if needed.
- UPDATE: `lib/db/role-definitions.test.ts` for read helper coverage and fixed-catalog guardrails.
- NEW: `app/api/super-admin/roles/route.ts`.
- NEW: `app/api/super-admin/roles/route.test.ts`.
- NEW: `app/(super-admin)/super-admin/roles/page.tsx`.
- UPDATE: `app/(super-admin)/super-admin/page.tsx` and/or nearby Super Admin navigation if adding a Role Catalog entry.
- UPDATE: `app/api/super-admin/auth-boundary.test.ts` for static route/UI guardrails.
- OPTIONAL NEW: `features/super-admin/role-catalog-*` only if a reusable component/helper keeps the page simpler.
- Do not add migrations, dependencies, Firebase changes, Meta API calls, Railway config, tenant-dashboard role assignment endpoints, or live database requirements.

### Testing Requirements

- Follow current Vitest route-test style with module mocks declared before route usage.
- Keep focused tests mock/static based; do not require a live database.
- Focused verification command should include:

```bash
npm run test -- lib/db/role-definitions.test.ts app/api/super-admin/roles/route.test.ts app/api/super-admin/auth-boundary.test.ts
```

- Then run the full verification set: `npm run test`, `npm run typecheck`, `npm run lint`, and `git diff --check`.

### Previous Story Intelligence

- Story 3.3 established that visible Super Admin operations should use protected API/page boundaries and avoid direct unsafe mutations from pages.
- Story 3.3 route work used stable `400`/`401`/`403`/`404`/`500` error shapes and leak-safe failure responses. Keep that discipline for the role catalog route.
- Story 3.3 review patches strengthened duplicate-submit protection, stable JSON failure handling, and service-owned transaction boundaries. For Story 3.4, the equivalent risk is not transaction handling but preventing any hidden custom-role mutation surface.
- Epic 2 retrospective action items apply:
  - Epic 3 repository functions must stay explicitly super-admin-only.
  - Epic 3 API stories must check auth denial, tenant-scope isolation, stable error fields, and audit behavior where mutations occur. Story 3.4 is read-only, so explicitly state no audit log is required unless a mutation endpoint is added.
  - Epic 3 must include visible UI operations, not API-only endpoints.

### Git Intelligence

- Recent commits:
  - `6303137 Implement super admin temple detail updates`
  - `0ce822b feat: add super admin temple detail`
  - `244ffe2 feat: add super admin login page`
  - `011fc02 feat: add super admin temple list`
  - `ab27941 Implement provision temple CLI`
- Worktree status at story creation: branch `main` was ahead of `origin/main` by 14 and behind by 4; no uncommitted changes were reported before this story file/status update.

### Latest Technical Information

- Use the repo-locked stack from `package.json`: Next.js `16.2.10`, React `19.2.4`, TypeScript, `pg` `^8.22.0`, Zod `^4.4.3`, and Vitest `^4.1.10`.
- No new library is justified for this story.
- Use existing App Router route-handler patterns under `app/api/super-admin/**/route.ts`.
- Use existing Server Component page patterns under `app/(super-admin)/super-admin/**/page.tsx`.

### Non-Goals

- Do not implement tenant member role assignment mutations; that is Story 3.5.
- Do not create tenant-local custom roles.
- Do not rename, delete, deactivate, or redefine V0 role codes.
- Do not use display labels for authorization.
- Do not add tenant role hierarchy, super-admin role hierarchy, billing, public signup, approval queues, deletion, transfer, impersonation, data export, WhatsApp management, Meta embedded signup, or webhook registration.
- Do not revive `admin_users`.
- Do not use `getPilotTenant()`.
- Do not add audit records for read-only catalog views.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.4-Govern-Fixed-Platform-Role-Definitions]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Super-Admin-Temple-Operations-And-Role-Governance]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-13---Role-definitions-are-platform-governed;-assignments-are-tenant-governed]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-18---V0-role-seeds-and-capabilities-are-fixed]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-4---Super-Admin-UI/API]
- [Source: _bmad-output/implementation-artifacts/3-3-update-provisioned-temple-details.md#Previous-Story-Intelligence]
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-07-19.md#Action-Items]
- [Source: lib/db/role-definitions.ts]
- [Source: lib/db/role-definitions.test.ts]
- [Source: types/db.ts]
- [Source: app/api/super-admin/temples/route.ts]
- [Source: app/api/super-admin/temples/route.test.ts]
- [Source: app/(super-admin)/super-admin/page.tsx]
- [Source: app/(super-admin)/super-admin/temples/[tenantId]/page.tsx]
- [Source: app/api/super-admin/auth-boundary.test.ts]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Red phase: `npm run test -- lib/db/role-definitions.test.ts app/api/super-admin/roles/route.test.ts app/api/super-admin/auth-boundary.test.ts` failed because `listRoleDefinitionsForSuperAdmin()` and `app/api/super-admin/roles/route.ts` did not exist.
- Task 1 focused verification: `npm run test -- lib/db/role-definitions.test.ts app/api/super-admin/roles/route.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 3 files / 17 tests.
- Red phase: `npm run test -- app/api/super-admin/auth-boundary.test.ts` failed because `app/(super-admin)/super-admin/roles/page.tsx` did not exist.
- Focused story verification: `npm run test -- lib/db/role-definitions.test.ts app/api/super-admin/roles/route.test.ts app/api/super-admin/auth-boundary.test.ts lib/auth/tenant-admin.test.ts lib/db/tenant-memberships.test.ts` - passed, 5 files / 33 tests.
- Full regression: `npm run test` - passed, 44 files / 334 tests.
- Final verification: `npm run typecheck` - passed.
- Final verification: `npm run lint` - passed.
- Final verification: `git diff --check` - passed.
- Code review patch verification: `npm run test -- lib/db/role-definitions.test.ts app/api/super-admin/roles/route.test.ts app/api/super-admin/auth-boundary.test.ts lib/auth/tenant-admin.test.ts lib/db/tenant-memberships.test.ts` - passed, 5 files / 38 tests.
- Code review patch full regression: `npm run test` - passed, 44 files / 339 tests.
- Code review patch final verification: `npm run typecheck` - passed.
- Code review patch final verification: `npm run lint` - passed.
- Code review patch final verification: `git diff --check` - passed.

### Completion Notes List

- Added `listRoleDefinitionsForSuperAdmin()` in `lib/db/role-definitions.ts`, returning the fixed V0 role catalog in canonical role-code order.
- Added protected `GET /api/super-admin/roles` with stable `401`/`403`/`500` responses and a stable `POST` rejection for deferred custom tenant-local roles.
- Added `/super-admin/roles` Role Catalog page behind `requireSuperAdminPage()`, using the protected roles API and existing UI primitives.
- Added Super Admin home navigation to the Role Catalog.
- Added repository, route, tenant-auth, and static boundary tests proving fixed role ordering, auth isolation, stable role-code authorization, no custom-role surface, and no Story 3.5 member-role mutation endpoint.
- Resolved all four accepted code-review patch findings: the role page now reads roles directly through the server repository after page auth, the repository fails closed on incomplete fixed catalogs, role API auth/storage failures return stable JSON, and all custom-role mutation verbs return a stable `405` with `Allow: GET`.

### File List

- `_bmad-output/implementation-artifacts/3-4-govern-fixed-platform-role-definitions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/(super-admin)/super-admin/page.tsx`
- `app/(super-admin)/super-admin/roles/page.tsx`
- `app/api/super-admin/auth-boundary.test.ts`
- `app/api/super-admin/roles/route.test.ts`
- `app/api/super-admin/roles/route.ts`
- `lib/auth/tenant-admin.test.ts`
- `lib/db/role-definitions.test.ts`
- `lib/db/role-definitions.ts`

### Change Log

- 2026-07-19: Implemented Story 3.4 fixed platform role catalog and moved story to review.
- 2026-07-19: Addressed code-review findings and moved Story 3.4 to done.
