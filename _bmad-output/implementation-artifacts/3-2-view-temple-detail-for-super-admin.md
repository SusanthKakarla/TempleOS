---
created_at: 2026-07-19T01:43:28+0530
baseline_commit: 011fc02
story_generation_note: "Created from bmad-create-story for explicitly requested Story 3.2, with Amelia implementation-readiness pass."
---

# Story 3.2: View Temple Detail For Super Admin

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a super admin,
I want to inspect one temple's tenant details, domain, members, roles, and WhatsApp linkage,
so that I can troubleshoot and verify setup.

## Acceptance Criteria

1. Given an authenticated super admin opens `/super-admin/temples/[tenantId]`, when the tenant exists, then the page shows tenant details, domain details, member list, role assignments, and WhatsApp linkage status, and all displayed data is fetched through super-admin-protected APIs.
2. Given a requested tenant ID does not exist, when the detail API is called, then the route returns `404`, and no unrelated tenant data is exposed.
3. Given a tenant admin tries to view another tenant through the Super Admin detail route, when authorization runs, then the request is rejected with `403`, and tenant membership is not accepted as super-admin privilege.
4. Given the detail repository is implemented, when it reads cross-tenant data, then it uses a clearly named super-admin-only function such as `getTenantDetailForSuperAdmin`, and tenant dashboard code cannot import or call it as a normal tenant-local helper.

## Tasks / Subtasks

- [x] Add the super-admin-only temple detail read model. (AC: 1, 2, 4)
  - [x] Extend `lib/db/tenants.ts` with `getTenantDetailForSuperAdmin(tenantId: string)`.
  - [x] Return tenant fields, active primary domain, all active tenant memberships with person phone numbers and role codes, and connected WhatsApp account status/details.
  - [x] Return `null` when the tenant does not exist; do not fall back to another tenant or `getPilotTenant()`.
  - [x] Keep the query read-only and deterministic. Member rows should have stable ordering, such as admin members first, then display name, then ID.
  - [x] Add focused repository tests in `lib/db/tenants.test.ts` covering full detail mapping, missing tenant as `null`, empty members, missing domain, and unlinked WhatsApp state.

- [x] Add protected `GET /api/super-admin/temples/[tenantId]`. (AC: 1, 2, 3, 4)
  - [x] Add `app/api/super-admin/temples/[tenantId]/route.ts`.
  - [x] Call `requireSuperAdmin()` before calling `getTenantDetailForSuperAdmin()`.
  - [x] Return `200` with `{ temple }` when found.
  - [x] Return `404` with stable error fields such as `{ error, code: "TEMPLE_NOT_FOUND" }` when the repository returns `null`.
  - [x] Return `401` for unauthenticated callers and `403` for tenant-admin-only sessions, matching `app/api/super-admin/temples/route.ts`.
  - [x] Return a leak-safe `500` for repository failures. Do not include SQL errors, tenant IDs from unrelated rows, or stack traces.
  - [x] Add route tests for success, `404`, unauthenticated denial, tenant-admin denial, and repository failure.

- [x] Implement the protected `/super-admin/temples/[tenantId]` detail page. (AC: 1, 2, 3)
  - [x] Add `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx`.
  - [x] Call `requireSuperAdminPage()` before reading detail data.
  - [x] Use Next 16 async params shape: `params: Promise<{ tenantId: string }>` and `const { tenantId } = await params`.
  - [x] Call `getTenantDetailForSuperAdmin(tenantId)` from the server page after authorization.
  - [x] Render `notFound()` when no tenant is returned.
  - [x] Render a compact operations view for tenant details, domain status, member list with role badges, and WhatsApp linkage status.
  - [x] Add a back link to `/super-admin` and do not add edit, delete, transfer, impersonation, data export, disconnect, or embedded signup controls.
  - [x] Reuse existing UI primitives from `components/ui/*` and lucide icons; do not add a new UI library.

- [x] Add guardrails preventing tenant-dashboard reuse. (AC: 3, 4)
  - [x] Extend `scripts/seed-bootstrap.test.ts` or `app/api/super-admin/auth-boundary.test.ts` to prove `getTenantDetailForSuperAdmin` is not imported or called from tenant dashboard pages, tenant APIs, or tenant session helpers.
  - [x] Prove the detail page authorization call appears before the broad cross-tenant detail read.
  - [x] Include the Epic 2 retrospective action item: Epic 3 repository functions stay explicitly super-admin-only.

- [x] Verify the story. (AC: 1, 2, 3, 4)
  - [x] Run focused tests for `lib/db/tenants.test.ts`, `app/api/super-admin/temples/[tenantId]/route.test.ts`, and the static guardrail tests.
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.
  - [x] Run `git diff --check`.

### Review Findings

- [x] [Review][Patch] Detail page bypasses the protected detail API — Decision resolved: AC1 is authoritative, so displayed `/super-admin/temples/[tenantId]` data must be fetched through `GET /api/super-admin/temples/[tenantId]` instead of a direct page-level repository call. Evidence: `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx:22`, `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx:38`, `_bmad-output/implementation-artifacts/3-2-view-temple-detail-for-super-admin.md:21`.
- [x] [Review][Patch] Temple detail page is not discoverable from the Super Admin temple list [`app/(super-admin)/super-admin/page.tsx:62`]
- [x] [Review][Patch] Detail-page login redirects to the new-temple form instead of the requested detail URL [`app/(super-admin)/super-admin/temples/[tenantId]/page.tsx:39`]
- [x] [Review][Patch] Malformed tenant IDs can reach a UUID SQL comparison and return `500` instead of `404` [`app/api/super-admin/temples/[tenantId]/route.ts:19`]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling source for Story 3.2.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` has an original MVP "Story 3.2: Admin Manually Adds Devotee"; that is not the active sprint story. For the current July 18 Super Admin slice, Story 3.2 is `View Temple Detail For Super Admin`.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `IMPLEMENTATION-PLAN.md` as the governing architecture.
- No `project-context.md` file is present in this checkout.

### Current State To Build On

- Story 3.1 is done and established the list pattern:
  - `lib/db/tenants.ts` exports `listTenantsForSuperAdmin()`.
  - `app/api/super-admin/temples/route.ts` exports protected `GET` and `POST`.
  - `app/(super-admin)/super-admin/page.tsx` calls `requireSuperAdminPage()` before `listTenantsForSuperAdmin()`.
  - `lib/db/tenants.test.ts`, `app/api/super-admin/temples/route.test.ts`, and `scripts/seed-bootstrap.test.ts` contain the current test/guardrail style.
- `app/api/super-admin/temples/route.ts` has the reusable auth-denial behavior this story should mirror: unauthenticated callers receive `401`, tenant-admin-only sessions receive `403`.
- `app/(super-admin)/super-admin/require-super-admin.ts` protects super-admin pages and currently redirects unauthenticated users to `/super-admin/login?next=...` and calls `forbidden()` for tenant-admin-only users.
- `lib/db/tenant-memberships.ts` can load one active membership by ID or person+tenant and maps role codes. Story 3.2 needs a tenant-wide member list, so add the read model in the super-admin tenant detail query instead of forcing tenant-local helpers into cross-tenant use.
- `lib/db/tenant-domains.ts` currently creates a primary domain and resolves active domains by hostname. Story 3.2 can select the active primary domain directly in `getTenantDetailForSuperAdmin()` rather than adding a broadly named domain helper.
- `lib/db/whatsapp-accounts.ts` has `getWhatsAppAccountByTenant(tenantId)`, but Story 3.2 should preferably return WhatsApp linkage in the single detail read to avoid extra page/API round trips and mixed auth boundaries.
- The current worktree has unrelated super-admin login changes. Preserve those changes and avoid touching login files unless route/page authorization tests require tiny compatibility updates.

### Architecture Compliance

- AD-1: Tenant-admin roles must never grant platform access. Both detail API and detail page must require super-admin authorization before reading any cross-tenant data.
- AD-3: Only super-admin-authorized APIs may accept explicit tenant IDs. The `[tenantId]` parameter is acceptable only after `requireSuperAdmin()` or `requireSuperAdminPage()`.
- AD-4: Do not use `getPilotTenant()` for Story 3.2.
- AD-5 and AD-11: WhatsApp is read-only status here. Show linked/unlinked details only; do not add transfer, disconnect, embedded signup, webhook registration, or self-serve setup controls.
- AD-6: No audit record is required for Story 3.2 because it is read-only. Do not add fake audit records for reads.
- AD-10: Cross-tenant reads must have explicit super-admin names. Use `getTenantDetailForSuperAdmin`, not `getTenantDetail`, `getTenantByIdWithMembers`, or tenant-dashboard helper names.
- AD-12 and AD-13: Person identity is global, membership and roles are tenant-scoped, and role definitions are platform-governed. Detail rows should join `persons`, `tenant_memberships`, `tenant_membership_roles`, and active `role_definitions`.
- Naming: use `super-admin` for platform-wide administrators and `tenant-admin` for temple-scoped administrators. Use `tenant` in code and `temple` in user-facing copy.

### Suggested Detail Shape

The exact type may vary, but keep it stable and explicit:

```ts
export interface SuperAdminTenantDetail {
  tenant: Tenant;
  domain: {
    id: string;
    hostname: string;
    kind: "primary" | "custom";
    status: "active" | "inactive";
    createdAt: string;
    updatedAt: string;
  } | null;
  members: Array<{
    id: string;
    personId: string;
    displayName: string;
    phoneNumber: string;
    status: "active" | "inactive";
    roles: RoleCode[];
    createdAt: string;
    updatedAt: string;
  }>;
  whatsappAccount: {
    id: string;
    phoneNumber: string;
    metaPhoneNumberId: string;
    metaBusinessAccountId: string;
    status: string;
    connectedAt: string | null;
    updatedAt: string;
  } | null;
}
```

- Keep secrets out of responses. The current WhatsApp fields are operational IDs already stored by provisioning; do not add access tokens or webhook secrets.
- If SQL aggregation is used, avoid nondeterministic role order. Prefer `array_agg(rd.code ORDER BY rd.code)` or explicit role ordering if needed.
- If the query uses multiple result sets, still keep all reads behind `getTenantDetailForSuperAdmin()` so the route/page has one super-admin-only repository boundary.

### File Structure Requirements

- NEW: `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx`.
- NEW: `app/api/super-admin/temples/[tenantId]/route.ts`.
- NEW: `app/api/super-admin/temples/[tenantId]/route.test.ts`.
- UPDATE: `lib/db/tenants.ts` for `SuperAdminTenantDetail` and `getTenantDetailForSuperAdmin()`.
- UPDATE: `lib/db/tenants.test.ts` for detail mapping and missing-tenant behavior.
- UPDATE: `scripts/seed-bootstrap.test.ts` and/or `app/api/super-admin/auth-boundary.test.ts` for static guardrails.
- Do not add new dependencies, live database requirements, Firebase changes, Meta API calls, Railway config, or a Next dev server requirement.

### Testing Requirements

- Follow current Vitest style with `vi.mock()` for route tests. Mocks must be declared before relying on imported route dependencies because Vitest hoists `vi.mock`.
- Dynamic route handlers should follow Next App Router conventions: `route.ts` exports `GET`, reads async `params`, and returns `NextResponse.json(...)`.
- Use Next 16 async dynamic page params. Do not write old synchronous `params.tenantId` page code.
- Focused verification command should include:

```bash
npm run test -- lib/db/tenants.test.ts app/api/super-admin/temples/[tenantId]/route.test.ts scripts/seed-bootstrap.test.ts app/api/super-admin/auth-boundary.test.ts
```

- Then run the full verification set: `npm run test`, `npm run typecheck`, `npm run lint`, and `git diff --check`.

### Previous Story Intelligence

- Story 3.1 proved the required ordering pattern: page authorization must happen before broad super-admin reads. Keep `await requireSuperAdminPage()` above `await getTenantDetailForSuperAdmin(...)`.
- Story 3.1 added static guardrails so tenant dashboard paths cannot import `listTenantsForSuperAdmin`. Extend the same guardrail to `getTenantDetailForSuperAdmin`.
- Story 3.1 review found stale timestamp and guardrail coverage issues. For Story 3.2, do not rely on only tenant `updated_at` if showing detail freshness; include domain, member, role assignment, and WhatsApp update times where displayed.
- Epic 2 retrospective action items apply directly:
  - Epic 3 repository functions must be explicitly super-admin-only.
  - API stories must check auth denial, tenant-scope isolation, stable error fields, and audit behavior where mutations occur.
  - WhatsApp V0 boundary is read-only status only.
  - Super Admin UI should expose visible list/detail/update/status flows, not API-only endpoints.

### Git Intelligence

- Recent commits:
  - `011fc02 feat: add super admin temple list`
  - `ab27941 Implement provision temple CLI`
  - `dbc9389 Implement super admin new temple form`
  - `a018a63 Implement super admin temple provisioning API`
  - `b6de425 Implement temple provisioning transaction`
- Baseline at story creation: `011fc02`.
- The current worktree is dirty with existing super-admin login page/session-boundary changes and an untracked login spec. Preserve them; do not revert or bundle unrelated changes into Story 3.2 implementation.

### Latest Technical Information

- Use the repo-locked stack from `package.json`: Next.js `16.2.10`, React `19.2.4`, TypeScript, `pg` `^8.22.0`, Zod `^4.4.3`, and Vitest `^4.1.10`.
- No new library is justified for this story.
- Next.js official docs for App Router dynamic routes use async `params` promises for pages and route handlers.
- Vitest official docs confirm `vi.mock` module mocks are hoisted/transformed, so route dependencies should stay mocked before assertions depend on route imports.

### Non-Goals

- Do not build Story 3.3 temple update behavior.
- Do not build role definition governance, member role assignment, tenant dashboard member management, public signup, billing, approval queues, deletion, transfer, impersonation, data export, Meta embedded signup, WhatsApp disconnect, WhatsApp transfer, webhook registration, or tenant-owned WhatsApp self-serve setup.
- Do not revive `admin_users`.
- Do not use `getPilotTenant()` for super-admin detail.
- Do not add audit records for read-only detail access.
- Do not add a new design system or dependency.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.2-View-Temple-Detail-For-Super-Admin]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Super-Admin-Temple-Operations-And-Role-Governance]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-1---Super-admins-are-separate-from-tenant-members]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-3---Tenant-identity-is-server-derived-except-in-super-admin-routes]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-10---Repository-scopes-must-be-visible-in-function-names-and-signatures]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-4---Super-Admin-UI/API]
- [Source: _bmad-output/implementation-artifacts/3-1-list-temples-for-super-admin.md#Previous-Story-Intelligence]
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-07-19.md#Action-Items]
- [Source: app/(super-admin)/super-admin/page.tsx]
- [Source: app/(super-admin)/super-admin/require-super-admin.ts]
- [Source: app/api/super-admin/temples/route.ts]
- [Source: app/api/super-admin/temples/route.test.ts]
- [Source: lib/db/tenants.ts]
- [Source: lib/db/tenant-memberships.ts]
- [Source: lib/db/tenant-domains.ts]
- [Source: lib/db/whatsapp-accounts.ts]
- [Source: scripts/seed-bootstrap.test.ts]
- [Source: app/api/super-admin/auth-boundary.test.ts]
- [Source: package.json]
- [Source: https://nextjs.org/docs/app/getting-started/route-handlers]
- [Source: https://vitest.dev/guide/mocking/modules.html]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Red phase: `npm run test -- lib/db/tenants.test.ts` failed with `TypeError: getTenantDetailForSuperAdmin is not a function`.
- Task 1 focused verification: `npm run test -- lib/db/tenants.test.ts` - passed, 1 file / 5 tests.
- Task 1 regression verification: `npm run test` - passed, 41 files / 292 tests.
- Red phase: `npm run test -- 'app/api/super-admin/temples/[tenantId]/route.test.ts'` failed because `app/api/super-admin/temples/[tenantId]/route.ts` did not exist.
- Task 2 focused verification: `npm run test -- lib/db/tenants.test.ts 'app/api/super-admin/temples/[tenantId]/route.test.ts'` - passed, 2 files / 10 tests.
- Task 2 regression verification: `npm run test` - passed, 42 files / 297 tests.
- Red phase: `npm run test -- app/api/super-admin/auth-boundary.test.ts` failed because `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx` did not exist.
- Task 3 and 4 focused verification: `npm run test -- lib/db/tenants.test.ts 'app/api/super-admin/temples/[tenantId]/route.test.ts' scripts/seed-bootstrap.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 4 files / 25 tests.
- Task 3 and 4 regression verification: `npm run test` - passed, 42 files / 299 tests.
- Early type verification: `npm run typecheck` - passed.
- Final verification: `npm run test` - passed, 42 files / 299 tests.
- Final verification: `npm run typecheck` - passed.
- Final verification: `npm run lint` - passed.
- Final verification: `git diff --check` - passed.
- Code review patch verification: `npm run test -- lib/db/tenants.test.ts 'app/api/super-admin/temples/[tenantId]/route.test.ts' scripts/seed-bootstrap.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 4 files / 26 tests.
- Code review patch verification: `npm run typecheck` - passed.
- Code review patch verification: `npm run test` - passed, 42 files / 300 tests.
- Code review patch verification: `npm run lint` - passed.
- Code review patch verification: `git diff --check` - passed.

### Completion Notes List

- Added `getTenantDetailForSuperAdmin()` in `lib/db/tenants.ts` with tenant, active primary domain, active members plus role codes, and connected WhatsApp account detail mapping.
- Added protected `GET /api/super-admin/temples/[tenantId]` with stable `200`, `401`, `403`, `404`, and `500` responses.
- Added protected `/super-admin/temples/[tenantId]` server page with tenant detail, domain, members/roles, WhatsApp linkage, `notFound()` handling, and `/super-admin` back navigation.
- Extended static guardrails so tenant-dashboard code cannot import the broad super-admin detail read and the detail page proves auth before cross-tenant reads.
- Story 3.2 is complete and ready for review.
- Resolved code review findings by routing the detail page through the protected detail API, adding list-to-detail navigation, preserving the detail URL as the super-admin login return path, and returning `404` for malformed tenant IDs.
- Story 3.2 passed code review patches and is done.

### File List

- `_bmad-output/implementation-artifacts/3-2-view-temple-detail-for-super-admin.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/(super-admin)/super-admin/page.tsx`
- `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx`
- `lib/db/tenants.ts`
- `lib/db/tenants.test.ts`
- `app/api/super-admin/temples/[tenantId]/route.ts`
- `app/api/super-admin/temples/[tenantId]/route.test.ts`
- `app/api/super-admin/auth-boundary.test.ts`
- `scripts/seed-bootstrap.test.ts`

### Change Log

- 2026-07-19: Implemented Story 3.2 super-admin temple detail read model, protected detail API, protected detail page, tenant-dashboard guardrails, and verification tests.
- 2026-07-19: Resolved code review findings and marked Story 3.2 done.
