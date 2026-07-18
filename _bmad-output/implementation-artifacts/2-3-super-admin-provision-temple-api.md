---
baseline_commit: b6de425bd8ef93b0468fad9ac723f6288005cf97
created_at: 2026-07-18T23:58:49+0530
story_generation_note: "Explicitly requested as Story 2.3 using bmad-create-story before bmad-agent-dev."
---

# Story 2.3: Super Admin Provision Temple API

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a super admin,
I want a protected API to provision a temple,
so that platform UI and tools can create temples through the canonical service.

## Acceptance Criteria

1. Given an authenticated super admin calls `POST /api/super-admin/temples`, when the request body is valid, then the route calls `provisionTemple(input, actor)` and returns the provisioned temple summary.
2. Given a tenant admin or unauthenticated user calls `POST /api/super-admin/temples`, when authorization runs, then the route rejects the request with `401` or `403` and no provisioning service call is made.
3. Given the request body is invalid, when validation runs, then the route returns `400` and the response identifies the invalid fields without exposing secrets.
4. Given provisioning detects a duplicate unique key such as hostname or Meta phone number ID, when the route handles the service error, then the route returns `409` and the response is stable enough for the UI to show a specific conflict message.

## Tasks / Subtasks

- [x] Add the Super Admin temple provisioning route. (AC: 1, 2, 3, 4)
  - [x] Create `app/api/super-admin/temples/route.ts`.
  - [x] Export `POST(req: NextRequest)` using the App Router route-handler pattern.
  - [x] Parse JSON with `await req.json().catch(() => null)` before validation.
  - [x] Call `requireSuperAdmin()` before calling `provisionTemple()`.
  - [x] Build the `ProvisionTempleActor` from the returned super-admin row: `type: "super_admin"`, `superAdminId: superAdmin.id`, `phoneNumber`, and `displayName`.

- [x] Preserve the auth boundary. (AC: 2)
  - [x] If `requireSuperAdmin()` returns a super admin, proceed.
  - [x] If no super-admin session exists and a valid tenant dashboard cookie exists, return `403` with code `FORBIDDEN`, matching `app/api/super-admin/me/route.ts`.
  - [x] If neither valid super-admin nor valid tenant session exists, return `401` with code `UNAUTHENTICATED`.
  - [x] Do not let tenant role `admin` satisfy this route.
  - [x] Do not import tenant dashboard auth helpers such as `@/lib/auth/tenant-admin`.

- [x] Map provisioning validation and service errors into stable API responses. (AC: 3, 4)
  - [x] Invalid JSON or validation failure returns `400`.
  - [x] Use `parseProvisionTempleInput(raw)` so invalid fields are reported from `errors: [{ path, message }]`.
  - [x] Do not expose raw request bodies, phone numbers, Meta IDs, stack traces, SQL constraints, or secrets in error responses.
  - [x] `ProvisionTempleError` with status `409` returns `409` and includes a stable code plus `field` when available.
  - [x] `ProvisionTempleError` with status `400` returns `400`.
  - [x] Unexpected provisioning failures return `500` with stable code `PROVISIONING_FAILED`.

- [x] Return a UI-ready success summary without adding list/detail behavior. (AC: 1)
  - [x] Return `201` on success.
  - [x] Response body should include the created `tenant`, `domain`, `firstMember`, `roles`, and `whatsappAccount`.
  - [x] Do not add `GET /api/super-admin/temples`; Story 3.1 owns list behavior.
  - [x] Do not add `GET/PATCH /api/super-admin/temples/[tenantId]`; Epic 3 owns detail/update behavior.

- [x] Add focused route tests. (AC: 1, 2, 3, 4)
  - [x] Add `app/api/super-admin/temples/route.test.ts`.
  - [x] Mock `requireSuperAdmin()`, tenant cookie inspection pieces, and `provisionTemple()`.
  - [x] Prove a valid super admin request calls `provisionTemple()` once with canonical parsed input and the correct actor.
  - [x] Prove invalid JSON/body returns `400` and does not call `provisionTemple()`.
  - [x] Prove unauthenticated requests return `401` and does not call `provisionTemple()`.
  - [x] Prove valid tenant session without super-admin privilege returns `403` and does not call `provisionTemple()`.
  - [x] Prove `ProvisionTempleError` conflict returns `409` with `field`.
  - [x] Prove unexpected errors return `500` without leaking stack details.

- [x] Extend static guardrails. (AC: 2)
  - [x] Update or add a static test under `app/api/super-admin` to keep new routes free of `admin-users`, `admin_users`, `getPilotTenant`, `requireLegacyTenantSuperAdmin`, tenant dashboard auth helpers, and direct repository provisioning sequences.
  - [x] Guard that the route imports `@/lib/provisioning/temples` and calls `provisionTemple`, rather than inserting tenant/person/membership/WhatsApp rows directly.

- [x] Verify implementation. (AC: 1, 2, 3, 4)
  - [x] Run `npm run test -- app/api/super-admin/temples/route.test.ts app/api/super-admin/auth-boundary.test.ts`.
  - [x] Run `npm run test -- lib/provisioning/temples.test.ts`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.

### Review Findings

- [x] [Review][Patch] Structurally invalid but syntactically valid JSON can bypass canonical validation [`app/api/super-admin/temples/route.ts:17`]
- [x] [Review][Patch] Service-level provisioning failures can echo internal `ProvisionTempleError` messages [`app/api/super-admin/temples/route.ts:70`]
- [x] [Review][Patch] Validation errors can echo raw user input in parser messages [`app/api/super-admin/temples/route.ts:59`]
- [x] [Review][Patch] Missing invalid tenant-cookie coverage on the provisioning route [`app/api/super-admin/temples/route.test.ts:222`]
- [x] [Review][Patch] Static provisioning guardrail is easy to bypass with case or naming variations [`app/api/super-admin/auth-boundary.test.ts:36`]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 2.3.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `IMPLEMENTATION-PLAN.md` as the governing architecture.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` is stale where it says Super Admin is out of scope. Epic 2 follows the July 18 Super Admin architecture.
- No `project-context.md` file is present in this checkout.

### Current State To Build On

- `lib/provisioning/temples.ts` now owns canonical input parsing and the atomic `provisionTemple()` transaction.
- `parseProvisionTempleInput(raw)` returns `{ ok: true, data }` or `{ ok: false, status: 400, code: "VALIDATION_ERROR", errors }`.
- `ProvisionTempleError` exposes `status`, `code`, and optional `field`. Duplicate slug, hostname, tenant/person membership, tenant WhatsApp account, and Meta phone number ID map to `409`.
- `app/api/super-admin/me/route.ts` already implements the local super-admin auth response pattern: `requireSuperAdmin()` first, then valid tenant cookie means `403`, otherwise `401`.
- `lib/auth/super-admin-session.ts` exposes `requireSuperAdmin()` and keeps the super-admin cookie/payload separate from tenant sessions.
- `lib/auth/session.ts` exposes `TENANT_SESSION_COOKIE_NAME` and `verifySessionToken()` for detecting valid tenant sessions when deciding `401` vs `403`.
- `app/api/super-admin/auth-boundary.test.ts` recursively scans `app/api/super-admin` route sources plus `lib/auth/super-admin-session.ts` for old auth footguns.
- There is no `app/api/super-admin/temples/` directory yet.

### Required Route Contract

Expected request body is the raw canonical provisioning input accepted by `parseProvisionTempleInput()`:

```ts
{
  tenant: {
    name: string;
    slug: string;
    defaultContactPhone?: string | null;
    address?: string | null;
    timezone: string;
  };
  domain: {
    subdomain: string;
  };
  firstMember: {
    phoneNumber: string;
    displayName: string;
    roles: string[];
  };
  whatsappAccount?: {
    phoneNumber: string;
    metaPhoneNumberId: string;
    metaBusinessAccountId: string;
  } | null;
}
```

Expected success response:

```ts
{
  temple: {
    tenant: Tenant;
    domain: TenantDomain;
    firstMember: TenantMembershipWithRoles;
    roles: RoleCode[];
    whatsappAccount: WhatsAppAccount | null;
  }
}
```

Use `201` for success. Keep this response close to `ProvisionTempleResult` so Story 2.4 can render the created summary without guessing.

### Error Contract Guidance

- Invalid JSON or invalid canonical input:
  - `400`
  - `{ error: "Invalid provisioning request", code: "VALIDATION_ERROR", errors: [{ path, message }] }`
- No valid super-admin session and no valid tenant session:
  - `401`
  - `{ error: "Super Admin session required", code: "UNAUTHENTICATED" }`
- Valid tenant session but no super-admin privilege:
  - `403`
  - `{ error: "Super Admin access required", code: "FORBIDDEN" }`
- Provisioning conflict:
  - `409`
  - `{ error: "Temple provisioning conflicts with an existing record.", code: "PROVISIONING_CONFLICT", field?: string }`
- Unexpected provisioning failure:
  - `500`
  - `{ error: "Temple provisioning failed.", code: "PROVISIONING_FAILED" }`

### Architecture Compliance

- AD-1: Cross-tenant actions require super-admin authorization from `super_admins`, not tenant memberships.
- AD-2: Super Admin API routes must call `lib/provisioning/temples.ts`; they must not sequence multi-table repository writes.
- AD-3: Only super-admin-authorized APIs may accept cross-tenant provisioning input.
- AD-4: New production provisioning must not call `getPilotTenant()`.
- AD-5: This is not public onboarding, billing, approval queues, tenant switching, Meta embedded signup, or tenant-owned WhatsApp self-serve connection UI.
- AD-6: Audit logging is already inside `provisionTemple()`; the route should not write a second audit entry.
- AD-9: API inputs must map into canonical service DTOs before mutation.
- AD-11: WhatsApp account ownership remains single-tenant and non-transferable through the service.
- AD-19: Domain storage uses full normalized `*.trytempleos.com` hostnames produced by the service parser.

### File Structure Requirements

- NEW: `app/api/super-admin/temples/route.ts`
- NEW: `app/api/super-admin/temples/route.test.ts`
- UPDATE: `app/api/super-admin/auth-boundary.test.ts` only if the existing recursive scan is insufficient for the new guardrail.
- Do not touch UI files under `app/(super-admin)` in this story.
- Do not add CLI files under `scripts/` in this story.
- Do not add repository helpers unless the route truly cannot use the existing service contract.

### Testing Requirements

- Follow current Vitest route-test style from `app/api/super-admin/me/route.test.ts` and `app/api/super-admin/auth/session/route.test.ts`.
- Use `vi.mock()` for `@/lib/auth/super-admin-session`, `@/lib/auth/session`, `next/headers`, and `@/lib/provisioning/temples`.
- Reset mocks in `beforeEach()`.
- Build test requests with `new Request("http://localhost/api/super-admin/temples", { method: "POST", body: JSON.stringify(body) })`.
- Tests should not require live Postgres, Firebase, Meta, Railway, or browser automation.

### Previous Story Intelligence

- Story 2.2 implemented `provisionTemple()` with one checked-out `pg` client, rollback on failure, stable conflict mapping, and no unsafe WhatsApp reassignment.
- Story 2.2 removed the stale tenant slug persistence gap and added `migrations/006_super_admin_provisioning.sql` plus `audit_log`.
- Review patches in Story 2.2 matter here: do not duplicate role assignment validation in the route, do not mask stable `ProvisionTempleError` fields, and do not introduce another provisioning path.
- Story 2.1/2.2 static guardrails intentionally prevent provisioning code from importing pilot lookup, legacy admin auth, tenant dashboard auth helpers, super-admin route code, or unsafe WhatsApp upsert behavior.

### Git Intelligence

- Recent commits:
  - `b6de425 Implement temple provisioning transaction`
  - `1fa72ae Implement canonical temple provisioning contract`
  - `294d9f8 tests`
  - `5e593d8 Enforce tenant admin dashboard access`
  - `2ad9082 Implement super admin phone OTP session`
- Branch state at story creation: `main` is ahead 7 and behind 4 relative to `origin/main`.

### Latest Technical Information

- Official Next.js Route Handler docs say route handlers live in `app/**/route.ts`, support `POST`, and use Web Request/Response plus `NextRequest`/`NextResponse` helpers. [Source: https://nextjs.org/docs/app/getting-started/route-handlers]
- Official Next.js `route.js` API docs show request bodies are read with standard Web API methods such as `request.json()`. [Source: https://nextjs.org/docs/app/api-reference/file-conventions/route#request-body]
- Official NextResponse docs show `NextResponse.json(body, { status })` as the local response helper pattern. [Source: https://nextjs.org/docs/app/api-reference/functions/next-response#json]

### Non-Goals

- Do not build `/super-admin/temples/new`; Story 2.4 owns the UI.
- Do not add `scripts/provision-temple.mts`; Story 2.5 owns the CLI.
- Do not add tenant list/detail/update endpoints; Epic 3 owns operations APIs.
- Do not add public signup, billing, approval queues, tenant switching, tenant deletion, tenant transfer, impersonation, data export, Meta embedded signup, webhook auto-registration, template approval, or tenant-owned WhatsApp self-serve connection UI.
- Do not revive `admin_users`.
- Do not use `getPilotTenant()` for this route.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.3-Super-Admin-Provision-Temple-API]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2-Super-Admin-Temple-Provisioning]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-1---Super-admins-are-separate-from-tenant-members]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-2---Provisioning-has-one-canonical-mutation-path]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-9---Provisioning-DTOs-are-canonical-service-contracts]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-11---WhatsApp-account-ownership-is-single-tenant-and-non-transferable-in-V0]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#Structural-Seed]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-4---Super-Admin-UIAPI]
- [Source: _bmad-output/implementation-artifacts/2-2-provision-temple-transaction.md#Completion-Notes-List]
- [Source: app/api/super-admin/me/route.ts]
- [Source: lib/provisioning/temples.ts]
- [Source: https://nextjs.org/docs/app/getting-started/route-handlers]
- [Source: https://nextjs.org/docs/app/api-reference/file-conventions/route#request-body]
- [Source: https://nextjs.org/docs/app/api-reference/functions/next-response#json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- app/api/super-admin/temples/route.test.ts app/api/super-admin/auth-boundary.test.ts` - RED failed on missing `app/api/super-admin/temples/route.ts`.
- `npm run test -- app/api/super-admin/temples/route.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 2 files / 9 tests.
- `npm run test -- lib/provisioning/temples.test.ts` - passed, 1 file / 17 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run test` - passed, 38 files / 249 tests.
- Code review - 0 decision-needed, 5 patch, 0 defer, 0 dismissed; all patches applied.
- `npm run test -- app/api/super-admin/temples/route.test.ts app/api/super-admin/auth-boundary.test.ts` - passed after review patches, 2 files / 13 tests.
- `npm run test -- lib/provisioning/temples.test.ts` - passed after review patches, 1 file / 17 tests.
- `npm run typecheck` - passed after review patches.
- `npm run lint` - passed after review patches.
- `git diff --check` - passed after review patches.
- `npm run test` - passed after review patches, 38 files / 253 tests.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented `POST /api/super-admin/temples` with super-admin-only authorization, tenant-session `403` detection, canonical provisioning validation, and `provisionTemple()` delegation.
- Added stable API response mapping for validation errors, provisioning conflicts, and unexpected provisioning failures without leaking sensitive details.
- Added focused route tests and expanded super-admin API guardrails to prevent direct DB provisioning and tenant-admin auth reuse.
- Applied code review patches for syntactically valid non-object JSON validation, sanitized service-level 500 responses, validation-message redaction, invalid tenant-cookie coverage, and stronger static provisioning guardrails.

### File List

- `_bmad-output/implementation-artifacts/2-3-super-admin-provision-temple-api.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/api/super-admin/auth-boundary.test.ts`
- `app/api/super-admin/temples/route.test.ts`
- `app/api/super-admin/temples/route.ts`

## Change Log

- 2026-07-18: Created Story 2.3 context file and marked ready for dev.
- 2026-07-19: Implemented Story 2.3 API route and moved story to review.
- 2026-07-19: Applied code review patches and moved Story 2.3 to done.
