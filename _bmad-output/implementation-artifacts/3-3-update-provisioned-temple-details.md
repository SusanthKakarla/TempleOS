---
created_at: 2026-07-19T02:24:00+0530
baseline_commit: 0ce822b2fca885b167b2e7bb8b6e23f820d72be1
story_generation_note: "Created from bmad-create-story for explicitly requested Story 3.3, before Amelia implementation."
---

# Story 3.3: Update Provisioned Temple Details

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a super admin,
I want to update safe temple fields such as name, contact phone, address, and timezone,
so that tenant setup can be corrected without destructive lifecycle actions.

## Acceptance Criteria

1. Given an authenticated super admin submits safe tenant detail changes, when `PATCH /api/super-admin/temples/[tenantId]` receives valid input, then it calls `updateProvisionedTemple({ tenantId, tenant }, actor)` and only allowed fields such as name, default contact phone, address, and timezone are updated.
2. Given the request attempts to update tenant slug, hostname ownership, deletion status, transfer ownership, billing, or impersonation settings, when validation runs, then the request is rejected and no out-of-scope lifecycle mutation occurs.
3. Given the safe update succeeds, when the transaction commits, then a durable audit log entry records the super-admin actor, tenant, action, target, and metadata and the updated temple detail is returned.
4. Given invalid data such as malformed phone or unsupported timezone is submitted, when validation runs, then the route returns `400` and field-specific errors are available to the UI.

## Tasks / Subtasks

- [x] Add the canonical safe temple update service. (AC: 1, 2, 3, 4)
  - [x] Extend `lib/provisioning/temples.ts` with `parseUpdateProvisionedTempleInput()` and `updateProvisionedTemple(input, actor)`.
  - [x] Accept only `tenant.name`, `tenant.defaultContactPhone`, `tenant.address`, and `tenant.timezone`; reject or ignore all lifecycle/domain fields by returning `400` validation errors before writes.
  - [x] Normalize optional contact phone with `normalizePhoneNumber`; convert blank optional strings to `null`; validate timezone with `Intl.DateTimeFormat`.
  - [x] Run the update and `createAuditLogEntry()` in one transaction using the transaction client.
  - [x] Return the updated `SuperAdminTenantDetail` by calling `getTenantDetailForSuperAdmin(tenantId, client)` before commit; if the tenant is missing, return a stable not-found error without creating an audit entry.
  - [x] Add focused tests in `lib/provisioning/temples.test.ts` covering valid updates, null clearing, invalid phone, invalid timezone, disallowed keys, missing tenant, audit metadata, rollback on audit failure, and actor enforcement.

- [x] Add protected `PATCH /api/super-admin/temples/[tenantId]`. (AC: 1, 2, 3, 4)
  - [x] Update `app/api/super-admin/temples/[tenantId]/route.ts` to export `PATCH` alongside existing `GET`.
  - [x] Call `requireSuperAdmin()` before parsing body or calling `updateProvisionedTemple()`.
  - [x] Validate malformed tenant IDs with the existing UUID guard and return `404` without calling the service.
  - [x] Return `200` with `{ temple }` after a safe update.
  - [x] Return `400` with `{ error, code: "VALIDATION_ERROR", errors }` for malformed phone, unsupported timezone, empty body, invalid JSON, or blocked lifecycle fields.
  - [x] Return `404` with `{ error, code: "TEMPLE_NOT_FOUND" }` when the service reports a missing tenant.
  - [x] Return `401` for unauthenticated callers and `403` for tenant-admin-only sessions, matching existing Super Admin routes.
  - [x] Return a leak-safe `500`; do not include SQL errors, stack traces, unrelated tenant IDs, or raw request body values.
  - [x] Extend `app/api/super-admin/temples/[tenantId]/route.test.ts` for success, auth denial, malformed UUID, validation errors, not found, and repository/service failure.

- [x] Add a visible safe-edit flow to the Super Admin temple detail UI. (AC: 1, 2, 3, 4)
  - [x] Add a client component under `features/super-admin/` for editing only name, contact phone, address, and timezone.
  - [x] Render the edit controls from `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx` using the existing detail payload.
  - [x] Submit to `/api/super-admin/temples/${tenantId}` with `PATCH`, display field-specific validation errors, and refresh the detail view after success.
  - [x] Reuse existing UI primitives from `components/ui/*`; do not add a new UI library.
  - [x] Do not add controls for slug, hostname, deletion, transfer, billing, impersonation, data export, WhatsApp update/disconnect/transfer, or Meta embedded signup.
  - [x] Add focused tests for form payload/error helpers if helpers are introduced; otherwise cover static UI guardrails in existing source tests.

- [x] Add guardrails for safe mutation scope. (AC: 1, 2, 3)
  - [x] Extend `scripts/seed-bootstrap.test.ts` and/or `app/api/super-admin/auth-boundary.test.ts` to prove the detail page remains behind `requireSuperAdminPage()` and calls the protected API for update/read behavior.
  - [x] Prove Super Admin UI sources do not contain destructive lifecycle controls or direct table mutation helpers.
  - [x] Prove Epic 3 repository/service functions stay out of tenant-dashboard code paths.
  - [x] Include the Epic 2 retrospective action items for explicit super-admin-only boundaries, auth denial, stable error fields, audit behavior for mutations, and visible UI operations.

- [x] Verify the story. (AC: 1, 2, 3, 4)
  - [x] Run focused tests for `lib/provisioning/temples.test.ts`, `app/api/super-admin/temples/[tenantId]/route.test.ts`, `scripts/seed-bootstrap.test.ts`, `app/api/super-admin/auth-boundary.test.ts`, and any new form-helper tests.
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.
  - [x] Run `git diff --check`.

### Review Findings

- [x] [Review][Patch] Audit metadata reports submitted fields instead of actual changed fields [lib/provisioning/temples.ts:452]
- [x] [Review][Patch] Safe update repository helper can be called outside the service-owned audit transaction [lib/db/tenants.ts:349]
- [x] [Review][Patch] Detail edit form can keep stale local state after a successful refresh [features/super-admin/temple-detail-edit-form.tsx:26]
- [x] [Review][Patch] PATCH auth lookup can escape stable JSON error handling if the super-admin session read throws [app/api/super-admin/temples/[tenantId]/route.ts:59]
- [x] [Review][Patch] Pending save guard relies only on button disabled state and can allow duplicate rapid submissions [features/super-admin/temple-detail-edit-form.tsx:45]
- [x] [Review][Patch] Missing-tenant service test invokes the update path twice and weakens transaction cleanup assertions [lib/provisioning/temples.test.ts:762]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 3.3.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` has a stale MVP "Story 3.3: Admin Edits Devotee Profile"; that is not the active sprint story. For the July 18 Super Admin slice, Story 3.3 is `Update Provisioned Temple Details`.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `IMPLEMENTATION-PLAN.md` as the governing architecture.
- No `project-context.md` file is present in this checkout.

### Current State To Build On

- Story 3.1 and 3.2 are done.
- `lib/provisioning/temples.ts` currently owns `provisionTemple()`, provisioning validation, transaction handling, conflict mapping, and audit logging. It imports `createAuditLogEntry()`, `getPool()`, tenant/person/domain/membership/WhatsApp repositories, `normalizePhoneNumber()`, Zod, and domain helpers.
- `lib/db/tenants.ts` currently exports:
  - `createTenantForSuperAdmin(input, client)`
  - historical `getPilotTenant()`
  - `getTenantById(tenantId)`
  - `listTenantsForSuperAdmin()`
  - `getTenantDetailForSuperAdmin(tenantId, client = getPool())`
  - `updateTenant(tenantId, fields)`, which currently uses `getPool()` directly and supports more fields than this story allows.
- Story 3.3 should add an explicit safe repository helper, such as `updateProvisionedTenantDetailsForSuperAdmin(tenantId, fields, client)`, or carefully adapt `updateTenant` to accept a `QueryClient` without widening the Super Admin safe-update surface. Do not call tenant-dashboard settings validation as the Super Admin contract; this story allows only name, default contact phone, address, and timezone.
- `app/api/super-admin/temples/[tenantId]/route.ts` currently exports only `GET`, with a shared UUID guard and local `superAdminAuthError()` behavior. Add `PATCH` here rather than creating a parallel route.
- `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx` currently calls `requireSuperAdminPage()` before fetching the protected detail API. Keep that ordering. The page already forwards cookies to the internal API and renders tenant/domain/member/WhatsApp detail.
- `app/api/super-admin/temples/[tenantId]/route.test.ts` already mocks `requireSuperAdmin()`, tenant session detection, and `getTenantDetailForSuperAdmin()`. Extend this file for `PATCH`.
- `lib/provisioning/temples.test.ts` already has a mocked transaction client and mocked `createAuditLogEntry()`; extend that pattern for update transaction tests.
- `scripts/seed-bootstrap.test.ts` and `app/api/super-admin/auth-boundary.test.ts` contain the current static guardrail style.

### Architecture Compliance

- AD-1: Tenant-admin roles must never grant platform access. `PATCH` and the page edit flow must require super-admin authorization before any cross-tenant mutation.
- AD-2: `lib/provisioning/temples.ts` owns super-admin mutations crossing tenant/audit boundaries. `PATCH` must call `updateProvisionedTemple()`, not raw repository sequences.
- AD-3: Explicit tenant IDs are acceptable only after super-admin authorization. Tenant dashboard routes must not call this update service.
- AD-5 and AD-7: Public signup, billing, approval queues, tenant deletion, transfer, impersonation, and data export remain out of scope.
- AD-6: The successful update must write one durable `audit_log` entry with `actorType: "super_admin"`, `actorId`, `tenantId`, `action`, `targetType: "tenant"`, `targetId`, and metadata that captures safe changed fields without leaking secrets.
- AD-9: Use canonical service DTO names: `tenantId` and `tenant`.
- AD-10: Repository and service names must expose Super Admin scope where cross-tenant mutation is possible.
- AD-11: WhatsApp is not editable in Story 3.3.
- Naming: use `super-admin` for platform-wide administrators and `tenant-admin` for temple-scoped administrators. Use `tenant` in code and `temple` in user-facing copy.

### Suggested Update Shape

```ts
export interface UpdateProvisionedTempleInput {
  tenantId: string;
  tenant: Partial<{
    name: string;
    defaultContactPhone: string | null;
    address: string | null;
    timezone: string;
  }>;
}

export type UpdateProvisionedTempleValidationResult =
  | { ok: true; data: UpdateProvisionedTempleInput }
  | { ok: false; status: 400; code: "VALIDATION_ERROR"; errors: ProvisionTempleValidationIssue[] };
```

- Recommended audit action: `temple.updated`.
- Recommended validation error paths: `tenant.name`, `tenant.defaultContactPhone`, `tenant.address`, `tenant.timezone`, and blocked paths such as `tenant.slug`, `domain.hostname`, `billing`, `impersonation`, `delete`, or `transfer`.
- If no safe fields are present, return `400` with a field-specific or form-level validation issue.
- Preserve route error semantics from the architecture: validation `400`, missing/invalid session `401`, insufficient privilege `403`, missing tenant `404`, and leak-safe server failure `500`.

### File Structure Requirements

- UPDATE: `lib/provisioning/temples.ts` for update validation, canonical service, transaction, and update-specific error mapping.
- UPDATE: `lib/provisioning/temples.test.ts` for service/validation/transaction/audit tests.
- UPDATE: `lib/db/tenants.ts` for a transaction-capable safe update helper if required.
- UPDATE: `lib/db/tenants.test.ts` if a new repository helper is added.
- UPDATE: `app/api/super-admin/temples/[tenantId]/route.ts` to add `PATCH`.
- UPDATE: `app/api/super-admin/temples/[tenantId]/route.test.ts` for protected patch tests.
- UPDATE: `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx` to render the edit flow.
- NEW or UPDATE: `features/super-admin/*` for the edit client component and optional helpers/tests.
- UPDATE: `scripts/seed-bootstrap.test.ts` and/or `app/api/super-admin/auth-boundary.test.ts` for static guardrails.
- Do not add dependencies, schema migrations, live database requirements, Firebase changes, Meta API calls, Railway config, or a Next dev server requirement.

### Testing Requirements

- Follow current Vitest style with `vi.mock()` in route tests. Vitest docs confirm `vi.mock` calls are hoisted before imports, so keep mocks declared before relying on imported route dependencies.
- Follow Next App Router route handler conventions. Next.js docs list `PATCH` as a supported route handler method under `app/**/route.ts`.
- For Zod 4 validation, use `safeParse()` and `error.issues`; Zod 4 docs state validation errors expose an `.issues` array and the migration guide notes `.errors` was removed.
- Keep tests static/mock-based; do not require a live database.
- Focused verification command should include:

```bash
npm run test -- lib/provisioning/temples.test.ts lib/db/tenants.test.ts 'app/api/super-admin/temples/[tenantId]/route.test.ts' scripts/seed-bootstrap.test.ts app/api/super-admin/auth-boundary.test.ts
```

- Then run the full verification set: `npm run test`, `npm run typecheck`, `npm run lint`, and `git diff --check`.

### Previous Story Intelligence

- Story 3.2 established that displayed detail data must flow through the protected detail API, not direct page-level repository calls. Keep update behavior on the protected API boundary too.
- Story 3.2 added malformed UUID handling so invalid tenant IDs return `404` without reaching SQL. Reuse that guard for `PATCH`.
- Story 3.2 proved the detail page authorization call must appear before protected API fetch behavior. Preserve that order.
- Story 3.1 and 3.2 static guardrails already prevent tenant-dashboard imports of broad Super Admin reads; extend the same protection for the update service/helper.
- Epic 2 retrospective action items apply directly:
  - Epic 3 repository functions must stay explicitly super-admin-only.
  - Epic 3 API stories must check auth denial, tenant-scope isolation, stable error fields, and audit behavior for mutations.
  - WhatsApp V0 boundary stays read-only.
  - Epic 3 must include visible UI flows, not API-only endpoints.

### Git Intelligence

- Recent commits:
  - `0ce822b feat: add super admin temple detail`
  - `244ffe2 feat: add super admin login page`
  - `011fc02 feat: add super admin temple list`
  - `ab27941 Implement provision temple CLI`
  - `dbc9389 Implement super admin new temple form`
- The worktree was clean at story creation.

### Latest Technical Information

- Use the repo-locked stack from `package.json`: Next.js `16.2.10`, React `19.2.4`, TypeScript, `pg` `^8.22.0`, Zod `^4.4.3`, and Vitest `^4.1.10`.
- No new library is justified for this story.
- Next.js official docs for route handlers support `PATCH` methods in `app/**/route.ts`.
- Vitest official docs confirm `vi.mock` module mocks are hoisted/transformed before imports.
- Zod 4 official docs show `.safeParse()` returns structured failures through `error.issues`; use that shape for field-specific errors.

### Non-Goals

- Do not update tenant slug, tenant domain/hostname ownership, tenant deletion state, transfer ownership, billing, impersonation, data export, role definitions, member roles, WhatsApp linkage, WhatsApp disconnect/transfer, Meta embedded signup, webhook registration, tenant-owned WhatsApp self-serve setup, public signup, or approval queues.
- Do not revive `admin_users`.
- Do not use `getPilotTenant()` for this update.
- Do not add audit records for failed validation or not-found updates.
- Do not add a new design system or dependency.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.3-Update-Provisioned-Temple-Details]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Super-Admin-Temple-Operations-And-Role-Governance]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-2---Provisioning-has-one-canonical-mutation-path]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-6---Privileged-writes-must-use-one-audit-log]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-7---Destructive-tenant-lifecycle-actions-are-out-of-scope]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-4---Super-Admin-UI/API]
- [Source: _bmad-output/implementation-artifacts/3-2-view-temple-detail-for-super-admin.md#Previous-Story-Intelligence]
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-07-19.md#Action-Items]
- [Source: lib/provisioning/temples.ts]
- [Source: lib/provisioning/temples.test.ts]
- [Source: lib/db/tenants.ts]
- [Source: app/api/super-admin/temples/[tenantId]/route.ts]
- [Source: app/api/super-admin/temples/[tenantId]/route.test.ts]
- [Source: app/(super-admin)/super-admin/temples/[tenantId]/page.tsx]
- [Source: scripts/seed-bootstrap.test.ts]
- [Source: app/api/super-admin/auth-boundary.test.ts]
- [Source: package.json]
- [Source: https://nextjs.org/docs/app/getting-started/route-handlers]
- [Source: https://vitest.dev/guide/mocking/modules.html]
- [Source: https://zod.dev/error-customization]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Red phase: `npm run test -- lib/provisioning/temples.test.ts lib/db/tenants.test.ts` failed because `parseUpdateProvisionedTempleInput`, `updateProvisionedTemple`, and `updateProvisionedTenantDetailsForSuperAdmin` did not exist.
- Task 1 focused verification: `npm run test -- lib/provisioning/temples.test.ts lib/db/tenants.test.ts` - passed, 2 files / 34 tests.
- Red phase: `npm run test -- 'app/api/super-admin/temples/[tenantId]/route.test.ts'` failed because `PATCH` did not exist.
- Task 2 focused verification: `npm run test -- 'app/api/super-admin/temples/[tenantId]/route.test.ts'` - passed, 1 file / 14 tests.
- Form helper verification: `npm run test -- features/super-admin/temple-detail-edit-form-helpers.test.ts` - passed, 1 file / 4 tests.
- Focused story verification: `npm run test -- lib/provisioning/temples.test.ts lib/db/tenants.test.ts 'app/api/super-admin/temples/[tenantId]/route.test.ts' features/super-admin/temple-detail-edit-form-helpers.test.ts scripts/seed-bootstrap.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 6 files / 68 tests.
- Full regression: `npm run test` - passed, 43 files / 322 tests.
- Static checks: `npm run typecheck` initially failed on a test fixture missing `phoneNumber`; fixed the fixture and reran successfully.
- Final verification: `npm run typecheck` - passed.
- Final verification: `npm run lint` - passed.
- Final verification: `git diff --check` - passed.
- Code review patch verification: `npm run test -- lib/provisioning/temples.test.ts lib/db/tenants.test.ts 'app/api/super-admin/temples/[tenantId]/route.test.ts' features/super-admin/temple-detail-edit-form-helpers.test.ts scripts/seed-bootstrap.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 6 files / 71 tests.
- Code review patch full regression: `npm run test` - passed, 43 files / 325 tests.
- Code review patch final verification: `npm run typecheck` - passed.
- Code review patch final verification: `npm run lint` - passed.
- Code review patch final verification: `git diff --check` - passed.

### Completion Notes List

- Added canonical safe provisioned-temple update validation and transaction service in `lib/provisioning/temples.ts`.
- Added `updateProvisionedTenantDetailsForSuperAdmin()` in `lib/db/tenants.ts` so only safe tenant fields update inside the service-owned transaction.
- Added protected `PATCH /api/super-admin/temples/[tenantId]` with stable `400`/`401`/`403`/`404`/`500` responses.
- Added Super Admin temple detail edit UI for name, contact phone, address, and timezone only, with field-level API validation display and refresh after success.
- Added service, repository, route, form-helper, and static guardrail coverage for Story 3.3.
- Resolved all six accepted code-review patch findings: audit metadata now records only actual changed fields, the safe update repository helper requires a service-owned transaction client, the edit form resets from refreshed tenant data, PATCH handles super-admin lookup failures with stable JSON, duplicate submits are guarded with a ref, and the missing-tenant update test uses one invocation with stronger cleanup assertions.

### File List

- `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx`
- `app/api/super-admin/auth-boundary.test.ts`
- `app/api/super-admin/temples/[tenantId]/route.test.ts`
- `app/api/super-admin/temples/[tenantId]/route.ts`
- `features/super-admin/temple-detail-edit-form-helpers.test.ts`
- `features/super-admin/temple-detail-edit-form-helpers.ts`
- `features/super-admin/temple-detail-edit-form.tsx`
- `lib/db/tenants.test.ts`
- `lib/db/tenants.ts`
- `lib/provisioning/temples.test.ts`
- `lib/provisioning/temples.ts`
- `scripts/seed-bootstrap.test.ts`
- `_bmad-output/implementation-artifacts/3-3-update-provisioned-temple-details.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-07-19: Implemented Story 3.3 safe provisioned-temple updates, protected patch route, edit UI, audit behavior, validation, and guardrail tests.
- 2026-07-19: Applied code-review patches, reran focused and full validation, and marked Story 3.3 done.
