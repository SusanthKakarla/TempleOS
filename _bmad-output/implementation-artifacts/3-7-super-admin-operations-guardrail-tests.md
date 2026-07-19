---
created_at: 2026-07-19T09:30:54+0530
baseline_commit: 0306a38
story_generation_note: "Created from bmad-create-story through Amelia for explicitly requested Story 3.7."
---

# Story 3.7: Super Admin Operations Guardrail Tests

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want tests for cross-tenant reads, safe updates, role governance, member role assignment, and excluded lifecycle actions,
so that operations stay inside the V0 boundary.

## Acceptance Criteria

1. Given Super Admin list and detail tests run, when an active super admin requests cross-tenant temple data, then summaries and detail are returned, and tenant admins or unauthenticated users are rejected.
2. Given safe update tests run, when allowed tenant fields are patched, then the changes persist with an audit log entry, and disallowed lifecycle fields such as deletion, transfer, impersonation, billing, or data export are rejected.
3. Given role governance tests run, when role definitions are viewed or used for assignment, then fixed V0 role codes are enforced, and tenant-local custom role creation is unavailable.
4. Given cross-tenant membership tests run, when a person's roles are changed in one tenant, then roles in another tenant remain unchanged, and authorization checks use the tenant-scoped membership.
5. Given WhatsApp status shell remains deferred, when Super Admin operations guardrail tests run, then active operations do not expose linked/unlinked WhatsApp status UI, and no update, disconnect, transfer, or embedded signup action is available.

## Tasks / Subtasks

- [x] Inventory current Epic 3 guardrail coverage before adding tests. (AC: 1, 2, 3, 4, 5)
  - [x] Run or inspect the existing focused Epic 3 tests and identify duplicated coverage versus true gaps.
  - [x] Keep existing focused route/service/repository tests in place; this story should add missing guardrails and acceptance-level static checks, not rewrite the whole test suite.
  - [x] Treat Story 3.6 as deferred and verify no test expectation requires WhatsApp status shell UI/API to exist.

- [x] Strengthen Super Admin read-route authorization and tenant-scope guardrails. (AC: 1)
  - [x] Extend `app/api/super-admin/temples/route.test.ts` and `app/api/super-admin/temples/[tenantId]/route.test.ts` only where coverage is missing.
  - [x] Prove list/detail reads call super-admin-only repository functions after super-admin authorization.
  - [x] Prove unauthenticated callers receive `401`, tenant-session-only callers receive `403`, malformed detail IDs return leak-safe `404`, and backend failures return stable error codes without leaking unrelated tenant data.
  - [x] Add or preserve static checks in `app/api/super-admin/auth-boundary.test.ts` proving tenant dashboard code does not import `listTenantsForSuperAdmin`, `getTenantDetailForSuperAdmin`, or Super Admin route-only helpers.

- [x] Close safe-update and lifecycle-exclusion guardrails. (AC: 2)
  - [x] Verify `lib/provisioning/temples.test.ts` covers `parseUpdateProvisionedTempleInput()` rejecting `slug`, domain/hostname edits, deletion, transfer, impersonation, billing, and data export fields before writes.
  - [x] Add any missing blocked field cases; current tests already cover slug/domain/deletion/transfer/impersonation/billing, so check specifically for data export and any route/UI lifecycle words that are not yet asserted.
  - [x] Preserve transaction/audit behavior: allowed updates call `updateProvisionedTenantDetailsForSuperAdmin()` and `createAuditLogEntry()` in the same transaction; audit failure rolls back; no-op safe submissions do not create audit noise.
  - [x] Keep UI guardrails in `app/api/super-admin/auth-boundary.test.ts` and `features/super-admin/temple-detail-edit-form-helpers.test.ts` aligned with safe fields only.

- [x] Strengthen fixed role-governance guardrails. (AC: 3)
  - [x] Keep `app/api/super-admin/roles/route.test.ts` proving `GET` lists fixed V0 roles and `POST`/`PUT`/`PATCH`/`DELETE` return `405 CUSTOM_ROLES_DEFERRED`.
  - [x] Add coverage if missing that role authorization and assignment use `RoleCode` / active `role_definitions.code`, never display labels.
  - [x] Update stale Story 3.4 static guardrails if they still claim Epic 3 has no member-role assignment route; after Story 3.5, the route is valid only under `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles`.
  - [x] Do not add custom role creation, rename, deactivate, capability editing, tenant overrides, or migrations.

- [x] Prove cross-tenant membership and role-assignment isolation. (AC: 4)
  - [x] Extend `lib/db/tenant-memberships.test.ts` and `lib/provisioning/temples.test.ts` only as needed to prove role replacement targets `tenantId + membershipId`, not `personId`.
  - [x] Add a same-person/two-tenant scenario if missing: changing Tenant A membership roles must leave Tenant B membership roles unchanged.
  - [x] Keep or add route-level tests for `PUT /api/super-admin/temples/[tenantId]/members/[membershipId]/roles`: auth before body parsing, invalid JSON, field-specific `400`, leak-safe `404`, leak-safe `500`, and tenant-admin `403`.
  - [x] Close the Epic 2 deferred duplicate-role/unique-conflict gap if it is still present, but do not turn duplicate role codes into a product error unless the current service contract chooses that behavior. Current Story 3.5 behavior treats duplicate submitted role codes as idempotent replacement.

- [x] Add WhatsApp deferral guardrails for active Epic 3 operations. (AC: 5)
  - [x] Preserve optional WhatsApp data captured during Epic 2 provisioning, but do not create a Story 3.6 status shell.
  - [x] Add static/source tests that active Super Admin list/detail/update/role pages do not expose linked/unlinked WhatsApp status UI, status-shell APIs, update controls, disconnect controls, transfer controls, or embedded signup controls.
  - [x] Keep existing provisioning tests for optional WhatsApp linkage and duplicate Meta phone conflicts intact; those are Epic 2 provisioning boundaries, not a Super Admin operations status shell.

- [x] Verify Story 3.7. (AC: 1, 2, 3, 4, 5)
  - [x] Run focused guardrail tests:

    ```bash
    npm run test -- app/api/super-admin/auth-boundary.test.ts app/api/super-admin/temples/route.test.ts 'app/api/super-admin/temples/[tenantId]/route.test.ts' app/api/super-admin/roles/route.test.ts 'app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts' lib/provisioning/temples.test.ts lib/db/tenant-memberships.test.ts features/super-admin/temple-detail-edit-form-helpers.test.ts features/super-admin/member-role-editor-helpers.test.ts
    ```

  - [x] Then run `npm run test`, `npm run typecheck`, `npm run lint`, and `git diff --check`.
  - [x] Update this story's Dev Agent Record with exact commands and results.

### Review Findings

- [x] [Review][Patch] Active Super Admin temple APIs still serialize deferred WhatsApp status/account data [app/api/super-admin/temples/route.ts:32]
- [x] [Review][Patch] Tenant-boundary static scan misses tenant-facing domain feature modules [app/api/super-admin/auth-boundary.test.ts:70]
- [x] [Review][Patch] Active operations WhatsApp deferral scan is underbroad for generic WhatsApp/status wording [app/api/super-admin/auth-boundary.test.ts:155]
- [x] [Review][Patch] Same-person/two-tenant role isolation is not directly modeled with a second tenant sentinel [lib/db/tenant-memberships.test.ts:163]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 3.7.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` is stale for this Super Admin slice where it conflicts with the July 18 architecture.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `_bmad-output/planning-artifacts/architecture/architecture-templeOS-logic-update-2026-07-18/ARCHITECTURE-SPINE.md` as governing architecture.
- No `project-context.md` file is present in this checkout.
- `sprint-status.yaml` currently has Story 3.5 in `review`, Story 3.6 `deferred`, and Story 3.7 `backlog` before this story creation. If Story 3.5 review changes tests or filenames, reconcile those changes first and do not overwrite them.

### Current State To Build On

- `app/api/super-admin/auth-boundary.test.ts` is the main static boundary suite. It already scans `app/api/super-admin`, `app/(super-admin)`, and `features/super-admin` for pilot/auth footguns and lifecycle controls.
- `app/api/super-admin/temples/route.test.ts` covers list/provision route behavior from Stories 3.1 and 2.3.
- `app/api/super-admin/temples/[tenantId]/route.test.ts` covers Story 3.2 detail reads and Story 3.3 safe updates, including `401`, `403`, malformed `404`, validation `400`, and stable `500`.
- `app/api/super-admin/roles/route.test.ts` covers Story 3.4 fixed role catalog reads and V0 rejection of custom role mutations.
- `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts` covers Story 3.5 route authorization, validation, not-found, and failure mapping.
- `lib/provisioning/temples.test.ts` is the canonical service-contract suite for provisioning, safe tenant updates, and member role assignment transactions/audit behavior.
- `lib/db/tenant-memberships.test.ts` covers membership lookup and role replacement repository semantics.
- `features/super-admin/temple-detail-edit-form-helpers.test.ts` and `features/super-admin/member-role-editor-helpers.test.ts` are the safest places for UI payload/error helper tests without requiring a browser.

### Architecture Compliance

- AD-1: tenant-admin roles never grant platform access. Guardrail tests must prove tenant-session-only callers are rejected on Super Admin operations.
- AD-2: `lib/provisioning/temples.ts` owns cross-tenant/person/membership/role/WhatsApp mutations. Route tests should assert route handlers call services, not multi-table SQL.
- AD-3: explicit tenant IDs are allowed only in super-admin-authorized APIs. Tests must keep auth before reads, parsing, and mutations.
- AD-6 and logic AD-11: privileged updates and role changes must write `audit_log` in the same transaction and rollback on audit failure.
- AD-7: deletion, transfer, impersonation, billing, and data export remain out of scope.
- AD-10 and logic AD-12: repository names/signatures must expose scope; Super Admin broad reads must not be imported into tenant dashboard paths.
- AD-12 and logic AD-14: person identity is global; membership and roles are tenant-scoped. Tests must target `tenantId + membershipId`, never only `personId`.
- AD-13 and AD-18: role definitions are platform-governed and fixed in V0; display labels must not drive authorization or assignment.
- AD-11: WhatsApp account ownership remains single-tenant, but Story 3.6 status shell is deferred. Do not add new operations UI/API for WhatsApp status or lifecycle.

### File Structure Requirements

- UPDATE: `app/api/super-admin/auth-boundary.test.ts` for static Epic 3 operation boundaries and Story 3.6 deferral checks.
- UPDATE AS NEEDED: `app/api/super-admin/temples/route.test.ts` for list read authorization/tenant-scope gaps.
- UPDATE AS NEEDED: `app/api/super-admin/temples/[tenantId]/route.test.ts` for detail/update gaps such as data export rejection or stable denial behavior.
- UPDATE AS NEEDED: `app/api/super-admin/roles/route.test.ts` for fixed V0 role-governance gaps.
- UPDATE AS NEEDED: `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts` for route-level role-assignment gaps.
- UPDATE AS NEEDED: `lib/provisioning/temples.test.ts` for service-level audit, blocked lifecycle, and same-person/cross-tenant role isolation gaps.
- UPDATE AS NEEDED: `lib/db/tenant-memberships.test.ts` for repository-level tenant-scoped membership role replacement gaps.
- UPDATE AS NEEDED: `features/super-admin/temple-detail-edit-form-helpers.test.ts` and `features/super-admin/member-role-editor-helpers.test.ts` for UI payload/error guardrails.
- OPTIONAL NEW: a focused static test file only if `auth-boundary.test.ts` becomes too broad. Prefer extending the existing boundary suite first.
- Do not add production feature files unless a test exposes a real bug in existing implementation.
- Do not add dependencies, migrations, Firebase changes, Meta API calls, Railway config, tenant-dashboard role-assignment endpoints, or live database requirements.

### Testing Requirements

- Follow current Vitest style: `vi.mock` declarations before route imports and use `vi.mocked(...)` for typed mocks.
- Current Vitest v4 docs still warn that `vi.mock` is hoisted before imports and recommend clearing/restoring mocks between runs; keep this repo's current pattern.
- Current Next.js App Router docs still define API handlers under `app/**/route.ts` with Web Request/Response APIs; keep route tests on existing `route.ts` files.
- Keep tests mock/static based; do not require a live database.
- Prefer adding exact source-boundary assertions over snapshot tests.
- A test that only checks a word is absent is acceptable for deferred/lifecycle guardrails, but pair it with at least one positive assertion proving the correct safe surface still exists.

### Previous Story Intelligence

- Story 3.5 is currently in `review` and has uncommitted files. It added `assignTenantMemberRoles()`, `PUT /api/super-admin/temples/[tenantId]/members/[membershipId]/roles`, member role editor helpers/components, and focused route/service/repository tests.
- Story 3.5 established duplicate submitted role codes as idempotent replacement, not a validation error.
- Story 3.4 created the fixed V0 role-catalog base. If any Story 3.4 static test still says the app has no member-role mutation route, update it to allow only the Story 3.5 Super Admin route while still blocking tenant-dashboard shortcuts.
- Story 3.3 established the safe update pattern: allowed fields only, service-owned transaction, audit in the same transaction, stable field errors, and no lifecycle controls.
- Story 3.2 established detail read patterns: `GET /api/super-admin/temples/[tenantId]` returns detail only after super-admin auth and returns leak-safe `404`/`500`.
- Story 3.1 established list read patterns and a static expectation that broad tenant reads stay Super Admin only.
- Epic 2 retrospective action items still apply: keep Epic 3 repository functions explicitly super-admin-only; include auth denial, tenant-scope isolation, stable error fields, and audit behavior where mutations occur; keep active UI visible but inside V0 boundaries.

### Git Intelligence

- Recent commits:
  - `0306a38 Implement super admin role catalog`
  - `6303137 Implement super admin temple detail updates`
  - `0ce822b feat: add super admin temple detail`
  - `244ffe2 feat: add super admin login page`
  - `011fc02 feat: add super admin temple list`
- Worktree status at story creation includes uncommitted Story 3.5/code-review changes in `3-5-assign-tenant-member-roles-as-super-admin.md`, `deferred-work.md`, `sprint-status.yaml`, `epics.md`, Super Admin temple detail UI, tenant membership/provisioning tests and services, code-review prompt files, member-role editor files, and the member-role route directory. Do not revert or overwrite those changes.

### Latest Technical Information

- Use the repo-locked stack from `package.json`: Next.js `16.2.10`, React `19.2.4`, TypeScript, `pg` `^8.22.0`, Zod `^4.4.3`, and Vitest `^4.1.10`.
- No new library is justified for this story.
- Current official Next.js docs state Route Handlers live in `app` as `route.js|ts` files and support Web Request/Response APIs. Keep tests aligned with the existing App Router route-handler files.
- Current official Vitest docs state `vi.mock` is hoisted before imports and mock state should be cleared/restored between test runs. Keep mocks at the top of route test files and reset them in `beforeEach`.

### Non-Goals

- Do not implement Story 3.6 WhatsApp status shell.
- Do not create linked/unlinked WhatsApp status UI, status-shell APIs, update controls, disconnect controls, transfer controls, or embedded signup controls.
- Do not create custom tenant-local roles or role-definition mutation UI.
- Do not add tenant deletion, tenant transfer, impersonation, billing, data export, public signup, approval queues, tenant switching, or Meta embedded signup.
- Do not revive `admin_users`.
- Do not use `getPilotTenant()`.
- Do not implement Epic 4 tenant-admin member management.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.7-Super-Admin-Operations-Guardrail-Tests]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.6-Show-WhatsApp-Linkage-Status-Shell-Deferred]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-1---Super-admins-are-separate-from-tenant-members]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-7---Destructive-tenant-lifecycle-actions-are-out-of-scope]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-12---Person-identity-is-global;-membership-and-roles-are-tenant-scoped]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-13---Role-definitions-are-platform-governed;-assignments-are-tenant-governed]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-logic-update-2026-07-18/ARCHITECTURE-SPINE.md#AD-15---Shared-member-mutation-service-owns-person,-membership,-role,-and-audit-writes]
- [Source: _bmad-output/implementation-artifacts/3-5-assign-tenant-member-roles-as-super-admin.md#Dev-Agent-Record]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#Deferred-from-Epic-3-scope-cut-2026-07-19]
- [Source: app/api/super-admin/auth-boundary.test.ts]
- [Source: app/api/super-admin/temples/route.test.ts]
- [Source: app/api/super-admin/temples/[tenantId]/route.test.ts]
- [Source: app/api/super-admin/roles/route.test.ts]
- [Source: app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts]
- [Source: lib/provisioning/temples.test.ts]
- [Source: lib/db/tenant-memberships.test.ts]
- [Source: package.json]
- [Source: Next.js Route Handlers docs, https://nextjs.org/docs/app/getting-started/route-handlers]
- [Source: Vitest Mocking docs, https://main.vitest.dev/guide/mocking]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Baseline focused inventory: `npm run test -- app/api/super-admin/auth-boundary.test.ts app/api/super-admin/temples/route.test.ts 'app/api/super-admin/temples/[tenantId]/route.test.ts' app/api/super-admin/roles/route.test.ts 'app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts' lib/provisioning/temples.test.ts lib/db/tenant-memberships.test.ts features/super-admin/temple-detail-edit-form-helpers.test.ts features/super-admin/member-role-editor-helpers.test.ts` - passed, 9 files / 112 tests.
- RED: `npm run test -- app/api/super-admin/auth-boundary.test.ts lib/provisioning/temples.test.ts lib/db/tenant-memberships.test.ts` - failed on active Super Admin list/detail WhatsApp status shell assertions.
- GREEN subset: `npm run test -- app/api/super-admin/auth-boundary.test.ts lib/provisioning/temples.test.ts lib/db/tenant-memberships.test.ts` - passed, 3 files / 61 tests.
- Focused GREEN: `npm run test -- app/api/super-admin/auth-boundary.test.ts app/api/super-admin/temples/route.test.ts 'app/api/super-admin/temples/[tenantId]/route.test.ts' app/api/super-admin/roles/route.test.ts 'app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts' lib/provisioning/temples.test.ts lib/db/tenant-memberships.test.ts features/super-admin/temple-detail-edit-form-helpers.test.ts features/super-admin/member-role-editor-helpers.test.ts` - passed, 9 files / 116 tests.
- Full regression: `npm run test` - passed, 46 files / 370 tests.
- Final verification: `npm run typecheck` - passed.
- Final verification: `npm run lint` - passed.
- Final verification: `git diff --check` - passed.
- Review patch verification: `npm run test -- app/api/super-admin/auth-boundary.test.ts app/api/super-admin/temples/route.test.ts 'app/api/super-admin/temples/[tenantId]/route.test.ts' app/api/super-admin/roles/route.test.ts 'app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts' lib/provisioning/temples.test.ts lib/db/tenant-memberships.test.ts features/super-admin/temple-detail-edit-form-helpers.test.ts features/super-admin/member-role-editor-helpers.test.ts` - passed, 9 files / 116 tests.
- Review patch full regression: `npm run test` - passed, 46 files / 370 tests.
- Review patch final verification: `npm run typecheck` - passed.
- Review patch final verification: `npm run lint` - passed.
- Review patch final verification: `git diff --check` - passed.

### Completion Notes List

- Added static boundary tests proving Super Admin repository/service helpers stay out of tenant dashboard/API code.
- Added active Super Admin operations guardrails that keep the deferred Story 3.6 WhatsApp status shell out of list/detail/role/member operations while preserving provisioning-time optional WhatsApp linkage.
- Removed linked/unlinked WhatsApp status UI from the active Super Admin temple list and detail pages.
- Added safe-update coverage for `dataExport` rejection.
- Added role-governance coverage proving display labels are rejected as role assignment input.
- Added tenant-membership repository coverage proving role replacement uses `tenantId + membershipId` rather than person identity.
- Resolved review findings by omitting deferred WhatsApp status/account fields from active Super Admin list/detail/update API responses.
- Expanded guardrails across tenant-facing feature modules and generic WhatsApp/status-shell wording while excluding auth/provisioning-only sources.
- Strengthened same-person/two-tenant role isolation coverage with a second-tenant sentinel.

### File List

- `_bmad-output/implementation-artifacts/3-7-super-admin-operations-guardrail-tests.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/(super-admin)/super-admin/page.tsx`
- `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx`
- `app/api/super-admin/auth-boundary.test.ts`
- `app/api/super-admin/temples/route.ts`
- `app/api/super-admin/temples/route.test.ts`
- `app/api/super-admin/temples/[tenantId]/route.ts`
- `app/api/super-admin/temples/[tenantId]/route.test.ts`
- `lib/db/tenant-memberships.test.ts`
- `lib/provisioning/temples.test.ts`

### Change Log

- 2026-07-19: Implemented Story 3.7 guardrail tests, removed active operations WhatsApp status shell, and moved story to review.
- 2026-07-19: Applied code-review patches, sanitized active operations API responses, and moved story to done.
