---
created_at: 2026-07-19T09:06:51+0530
baseline_commit: 6303137
story_generation_note: "Created from bmad-create-story through Amelia for explicitly requested Story 3.5."
---

# Story 3.5: Assign Tenant Member Roles As Super Admin

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a super admin,
I want to assign or remove allowed roles for a member inside a tenant,
so that first setup and support corrections can be handled centrally.

## Acceptance Criteria

1. Given an authenticated super admin updates a tenant member's roles, when `PUT /api/super-admin/temples/[tenantId]/members/[membershipId]/roles` receives valid role codes, then it calls `assignTenantMemberRoles` with the tenant ID, membership or person target, and role list, and the role assignments are scoped only to that tenant membership.
2. Given the same person belongs to multiple tenants, when roles are changed for one tenant membership, then memberships and roles in other tenants are unchanged, and the response makes the target tenant context explicit.
3. Given a request includes an inactive or unknown role code, when validation runs, then the route returns `400`, and no partial role assignment is committed.
4. Given a tenant admin without super-admin privilege calls the Super Admin role assignment route, when authorization runs, then the request is rejected, and tenant admins must use tenant-local member management routes for their own tenant in Epic 4.
5. Given a super-admin role assignment succeeds, when the transaction commits, then an audit log entry records the actor, tenant, target membership, assigned roles, and removed roles.

## Tasks / Subtasks

- [x] Add validated role-assignment service input and stable errors. (AC: 1, 3, 5)
  - [x] Extend `lib/provisioning/temples.ts` with `parseAssignTenantMemberRolesInput()` or equivalent, accepting only `{ roles: RoleCode[] }` plus server-derived `tenantId` and `membershipId`.
  - [x] Add `AssignTenantMemberRolesError` with stable statuses/codes for validation, not found, conflict, and generic failure.
  - [x] Reject malformed UUIDs, invalid JSON, missing `roles`, duplicate role codes if the product chooses that as invalid, unknown role codes, and inactive role definitions before any assignment write.
  - [x] Keep allowed roles to active V0 `RoleCode` values from `role_definitions`; display labels must never authorize or validate a request.

- [x] Implement transactional role replacement behind the canonical service boundary. (AC: 1, 2, 3, 5)
  - [x] Add `assignTenantMemberRoles(input, actor)` to `lib/provisioning/temples.ts`.
  - [x] Require `actor.type === "super_admin"` and `actor.superAdminId`; tenant-member actors must be rejected even if they have `admin`.
  - [x] Open one `pg` transaction client in the service, not in the route.
  - [x] Load the target active membership by both `tenantId` and `membershipId`; missing, inactive, or cross-tenant memberships return `404`/stable not-found without leaking another tenant.
  - [x] Replace `tenant_membership_roles` for that one `membershipId` only; do not update roles by `personId`.
  - [x] Verify every requested active role was assigned before commit; if not, rollback and return validation/failure without partial role state.
  - [x] Write `audit_log` in the same transaction with action such as `tenant_member.roles_assigned`, `actorType: "super_admin"`, `actorId`, `tenantId`, `targetType: "tenant_membership"`, `targetId: membershipId`, and metadata containing `assignedRoles` and `removedRoles`.
  - [x] Reload and return `getTenantDetailForSuperAdmin(tenantId, client)` or an explicit membership result whose `tenantId` is visible in the response.

- [x] Extend repository helpers without creating tenant-dashboard shortcuts. (AC: 1, 2, 3)
  - [x] Extend `lib/db/tenant-memberships.ts` with super-admin-safe helpers such as `getTenantMembershipByTenantAndId()` and `replaceTenantMembershipRolesForSuperAdmin()` or service-private repository operations.
  - [x] Preserve `assignTenantMembershipRolesForProvisioning()` for provisioning; do not broaden it into a generic route helper unless it remains safe for provisioning semantics.
  - [x] Cover cross-tenant safety: a membership ID from Tenant B must not be found or changed when the route path uses Tenant A.
  - [x] Add the Epic 2 deferred duplicate-conflict test in this scope. The expected behavior should be idempotent replacement or a stable conflict mapping, but never partial assignment.

- [x] Add the protected Super Admin roles route. (AC: 1, 3, 4, 5)
  - [x] Add `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.ts` with `PUT`.
  - [x] Authenticate with `requireSuperAdmin()` before parsing the body, matching existing Super Admin route discipline.
  - [x] Reuse the tenant-session cookie check from existing Super Admin routes so tenant-admin-only callers receive `403` and unauthenticated callers receive `401`.
  - [x] Validate route params as UUIDs and return leak-safe `404` for malformed or missing targets.
  - [x] Return stable JSON responses: success `{ temple }` or `{ member }`, `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 MEMBER_NOT_FOUND`, and leak-safe `500 ROLE_ASSIGNMENT_FAILED`.
  - [x] Do not accept `tenantId`, `personId`, `displayName`, capability sets, custom role codes, role labels, audit fields, or actor IDs from the request body.

- [x] Add visible Super Admin UI for member role correction. (AC: 1, 2, 3, 5)
  - [x] Update `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx` or a focused component under `features/super-admin/` so each active member can edit roles from the existing detail page.
  - [x] Load the fixed V0 role catalog from the existing protected role API or server-side equivalent; show only active allowed roles.
  - [x] Use checkboxes/toggles or a compact multi-select pattern; include saving, saved, validation-error, and failed states without layout shift.
  - [x] Make the target tenant/member context visible during save, especially after success.
  - [x] Refresh the temple detail after success so changed roles are visible and live tenant authorization can observe the next guarded request.
  - [x] Do not add member creation, membership deactivation, tenant-local custom role creation, capability editing, WhatsApp management, impersonation, deletion, transfer, billing, public onboarding, or data export.

- [x] Verify Story 3.5. (AC: 1, 2, 3, 4, 5)
  - [x] Add focused service tests in `lib/provisioning/temples.test.ts` for success, cross-tenant miss, inactive/unknown role rejection, rollback on audit failure, and actor rejection.
  - [x] Add focused repository tests in `lib/db/tenant-memberships.test.ts` for active role validation/replacement and cross-tenant targeting.
  - [x] Add route tests in `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts` for `200`, `400`, `401`, `403`, `404`, and leak-safe `500`.
  - [x] Update `app/api/super-admin/auth-boundary.test.ts` so tenant dashboard code cannot import super-admin member-role helpers and the new route stays under `app/api/super-admin/**`.
  - [x] Add page/component tests only if existing test patterns support them; otherwise keep route/service/static tests as the acceptance gate.
  - [x] Run focused tests, then `npm run test`, `npm run typecheck`, `npm run lint`, and `git diff --check`.

### Review Findings

- [x] [Review][Patch] Reject extra role-assignment body fields [lib/provisioning/temples.ts:219]
- [x] [Review][Patch] Validate active DB role definitions before replacement writes [lib/provisioning/temples.ts:611]
- [x] [Review][Patch] Return leak-safe not-found for malformed route IDs [app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.ts:43]
- [x] [Review][Patch] Guard role replacement by tenant and active membership at the write boundary [lib/db/tenant-memberships.ts:127]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 3.5.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` is stale for this slice where it conflicts with the July 18 Super Admin architecture.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `_bmad-output/planning-artifacts/architecture/architecture-templeOS-logic-update-2026-07-18/ARCHITECTURE-SPINE.md` as governing architecture.
- No `project-context.md` file is present in this checkout.
- Story 3.4 is currently `review` in `sprint-status.yaml`. Implement Story 3.5 after either completing 3.4 review or consciously accepting the current 3.4 role-catalog files as the base.

### Current State To Build On

- `lib/provisioning/temples.ts` is the canonical service boundary. It already exposes `provisionTemple()` and `updateProvisionedTemple()` and owns transaction handling plus audit writes for privileged Super Admin mutations.
- `lib/db/tenant-memberships.ts` already has `getTenantMembershipById()` and `assignTenantMembershipRolesForProvisioning()`. That assignment helper inserts requested active roles and verifies they were assigned, but it is provisioning-specific and does not remove roles or validate `tenantId + membershipId`.
- `lib/db/tenants.ts:getTenantDetailForSuperAdmin(tenantId, client?)` already returns tenant, primary domain, active members, active role codes, and WhatsApp account. It filters members by `tm.tenant_id = $1 AND tm.status = 'active'`.
- `lib/db/role-definitions.ts` now exposes `V0_ROLE_DEFINITIONS` and `listRoleDefinitionsForSuperAdmin()` from Story 3.4. The V0 role codes are exactly `admin`, `priest`, `committee_member`, `volunteer`, and `devotee`.
- `types/db.ts` exports `ROLE_CODES`, `RoleCode`, and `isRoleCode()`. Use these for parsing and typing; do not invent role strings.
- `lib/db/audit-log.ts:createAuditLogEntry(input, client)` writes durable audit rows and accepts an injected transaction client.
- Existing Super Admin routes use `requireSuperAdmin()`, stable auth error shapes, UUID param validation, and leak-safe `500` responses.
- `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx` already renders member rows and role badges. Story 3.5 should turn that member-role area into an editable Super Admin operation.

### Architecture Compliance

- AD-1: tenant-admin roles never grant platform access. The new route must require super-admin authorization before any read, parse, or mutation.
- AD-2: `lib/provisioning/temples.ts` owns `assignTenantMemberRoles`; API/UI code must call the service, not perform multi-table SQL directly.
- AD-3: explicit tenant IDs are allowed only in super-admin-authorized APIs.
- AD-6 and AD-11: role assignment is a privileged write and must write `audit_log` in the same transaction. Audit failure rolls back role changes.
- AD-10 and logic AD-12: repository names/signatures must expose scope. Super-admin-only helpers should say so or require both `tenantId` and `membershipId`.
- AD-12 and logic AD-14: person identity is global; membership and roles are tenant-scoped. Role replacement targets `tenant_memberships.id` scoped by `tenant_id`, never only `person_id`.
- AD-13: role definitions are platform-governed; assignments are tenant-governed. Story 3.5 assigns existing active V0 roles only.
- AD-18: V0 role seeds and capabilities are fixed. `devotee` may be assigned as a tenant relationship marker, but it does not grant dashboard login by itself.

### Suggested API Contract

```ts
// PUT /api/super-admin/temples/[tenantId]/members/[membershipId]/roles
type AssignTenantMemberRolesRequest = {
  roles: RoleCode[];
};

type AssignTenantMemberRolesSuccess =
  | { member: SuperAdminTenantMember }
  | { temple: SuperAdminTenantDetail };
```

- Recommended success response: `200` with a reloaded member or temple detail. Include `tenantId` and `membershipId` in the returned object.
- Recommended auth responses: `401` `{ error: "Super Admin session required", code: "UNAUTHENTICATED" }`; `403` `{ error: "Super Admin access required", code: "FORBIDDEN" }`.
- Recommended validation response: `400` `{ error: "Invalid role assignment request", code: "VALIDATION_ERROR", errors: [...] }`.
- Recommended not-found response: `404` `{ error: "Member not found.", code: "MEMBER_NOT_FOUND" }`.
- Recommended failure response: `500` `{ error: "Role assignment failed.", code: "ROLE_ASSIGNMENT_FAILED" }`.

### File Structure Requirements

- UPDATE: `lib/provisioning/temples.ts` for validation, error class, and `assignTenantMemberRoles()`.
- UPDATE: `lib/provisioning/temples.test.ts` for service transaction, rollback, conflict, and audit coverage.
- UPDATE: `lib/db/tenant-memberships.ts` for target-scoped lookup/replacement helpers.
- UPDATE: `lib/db/tenant-memberships.test.ts` for repository replacement and cross-tenant targeting coverage.
- NEW: `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.ts`.
- NEW: `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts`.
- UPDATE: `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx` or NEW `features/super-admin/member-role-editor.tsx`.
- UPDATE: `app/api/super-admin/auth-boundary.test.ts` for static guardrails.
- OPTIONAL UPDATE: `app/api/super-admin/roles/route.ts` only if the UI needs an existing role-catalog fetch path adjusted.
- Do not add migrations, dependencies, Firebase changes, Meta API calls, Railway config, tenant-dashboard role-assignment endpoints, or live database requirements.

### Testing Requirements

- Follow current Vitest route-test style with module mocks declared before route usage.
- Keep focused tests mock/static based; do not require a live database.
- Add at least one test proving same-person cross-tenant safety: changing Tenant A membership roles must not update Tenant B membership roles.
- Add one test for inactive role definitions or unknown role codes that proves no delete/insert/audit write occurs.
- Add one rollback test where audit insert fails after role replacement.
- Focused verification command should include:

```bash
npm run test -- lib/provisioning/temples.test.ts lib/db/tenant-memberships.test.ts app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts app/api/super-admin/auth-boundary.test.ts
```

- Then run the full verification set: `npm run test`, `npm run typecheck`, `npm run lint`, and `git diff --check`.

### Previous Story Intelligence

- Story 3.4 created the fixed role-catalog base and explicitly left the member-role mutation endpoint to Story 3.5.
- Story 3.4 added static guardrails that currently assert the Super Admin role catalog story did not introduce `assignTenantMemberRoles`, `tenant_membership_roles`, `membershipId`, or `members/[...]` mutation endpoints. Story 3.5 must update those guardrails to allow only the intentional 3.5 route/service while still blocking tenant-dashboard shortcuts.
- Story 3.3 established stable Super Admin mutation patterns: validate only safe fields, call service-owned transaction boundaries, write audit metadata in the same transaction, return leak-safe errors, and avoid duplicate-submit or hidden lifecycle controls in UI.
- Epic 2 retrospective action items apply directly:
  - Add the deferred role-assignment duplicate-conflict test in this story.
  - Keep Epic 3 repository functions explicitly super-admin-only, with tests or guardrails preventing tenant dashboard imports.
  - Include auth denial, tenant-scope isolation, stable error fields, and audit behavior for this API story.
  - Keep Super Admin UI visible and usable, not API-only.

### Git Intelligence

- Recent commits:
  - `6303137 Implement super admin temple detail updates`
  - `0ce822b feat: add super admin temple detail`
  - `244ffe2 feat: add super admin login page`
  - `011fc02 feat: add super admin temple list`
  - `ab27941 Implement provision temple CLI`
- Worktree status at story creation: branch `main` is ahead of `origin/main` by 14 and behind by 4. Story 3.4 has uncommitted review-state changes in `sprint-status.yaml`, role-catalog route/UI/tests, and related role-definition files. Do not overwrite or revert those changes.

### Latest Technical Information

- Use the repo-locked stack from `package.json`: Next.js `16.2.10`, React `19.2.4`, TypeScript, `pg` `^8.22.0`, Zod `^4.4.3`, and Vitest `^4.1.10`.
- No new library is justified for this story.
- Use existing App Router route-handler patterns under `app/api/super-admin/**/route.ts`.
- Use existing Server Component and client component patterns under `app/(super-admin)/super-admin/**` and `features/super-admin/**`.

### Non-Goals

- Do not create or redefine role definitions; Story 3.4 owns the fixed role catalog.
- Do not create custom tenant-local roles.
- Do not edit role capabilities or use display labels for authorization.
- Do not create persons, memberships, tenants, domains, WhatsApp accounts, or tenant-local member-management routes.
- Do not implement Epic 4 tenant-admin member management.
- Do not add tenant switching, public signup, billing, approval queues, deletion, transfer, impersonation, data export, WhatsApp update/disconnect/transfer, Meta embedded signup, or webhook registration.
- Do not revive `admin_users`.
- Do not use `getPilotTenant()`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.5-Assign-Tenant-Member-Roles-As-Super-Admin]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Super-Admin-Temple-Operations-And-Role-Governance]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-2---Provisioning-has-one-canonical-mutation-path]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-6---Privileged-writes-must-use-one-audit-log]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-12---Person-identity-is-global;-membership-and-roles-are-tenant-scoped]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-13---Role-definitions-are-platform-governed;-assignments-are-tenant-governed]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-logic-update-2026-07-18/ARCHITECTURE-SPINE.md#AD-15---Shared-member-mutation-service-owns-person,-membership,-role,-and-audit-writes]
- [Source: _bmad-output/implementation-artifacts/3-4-govern-fixed-platform-role-definitions.md#Previous-Story-Intelligence]
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-07-19.md#Action-Items]
- [Source: lib/provisioning/temples.ts]
- [Source: lib/db/tenant-memberships.ts]
- [Source: lib/db/role-definitions.ts]
- [Source: lib/db/audit-log.ts]
- [Source: lib/db/tenants.ts]
- [Source: app/api/super-admin/temples/[tenantId]/route.ts]
- [Source: app/(super-admin)/super-admin/temples/[tenantId]/page.tsx]
- [Source: app/api/super-admin/auth-boundary.test.ts]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- RED: `npm run test -- lib/provisioning/temples.test.ts lib/db/tenant-memberships.test.ts 'app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts' features/super-admin/member-role-editor-helpers.test.ts app/api/super-admin/auth-boundary.test.ts` failed with missing repository helpers, service exports, route file, and UI helper file.
- Focused GREEN: `npm run test -- lib/provisioning/temples.test.ts lib/db/tenant-memberships.test.ts 'app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts' features/super-admin/member-role-editor-helpers.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 5 files / 65 tests.
- Typecheck cleanup: `npm run typecheck` initially failed on readonly/string role fixture types in `lib/provisioning/temples.test.ts`; fixed with explicit `TenantMembershipWithRoles` fixtures.
- Full regression: `npm run test` - passed, 46 files / 362 tests.
- Final verification: `npm run typecheck` - passed.
- Final verification: `npm run lint` - passed.
- Final verification: `git diff --check` - passed.

### Completion Notes List

- Added tenant-scoped super-admin member role replacement through `assignTenantMemberRoles()` in `lib/provisioning/temples.ts`, including validation, stable errors, transaction handling, audit metadata, and rollback on audit/write failures.
- Added repository helpers in `lib/db/tenant-memberships.ts` for active `tenantId + membershipId` lookup and role replacement against active role definitions only.
- Added protected `PUT /api/super-admin/temples/[tenantId]/members/[membershipId]/roles` with stable `400`/`401`/`403`/`404`/`500` responses and auth-before-body parsing.
- Added visible Super Admin member role editing on the temple detail page with active V0 role checkboxes, save/error/saved states, duplicate-submit guard, and refresh after success.
- Added focused repository, service, route, UI-helper, and static-boundary coverage for cross-tenant isolation, invalid roles, audit rollback, and tenant-admin denial.

### File List

- `_bmad-output/implementation-artifacts/3-5-assign-tenant-member-roles-as-super-admin.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx`
- `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts`
- `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.ts`
- `features/super-admin/member-role-editor-helpers.test.ts`
- `features/super-admin/member-role-editor-helpers.ts`
- `features/super-admin/member-role-editor.tsx`
- `lib/db/tenant-memberships.test.ts`
- `lib/db/tenant-memberships.ts`
- `lib/provisioning/temples.test.ts`
- `lib/provisioning/temples.ts`

### Change Log

- 2026-07-19: Implemented Story 3.5 super-admin tenant member role assignment and moved story to review.
