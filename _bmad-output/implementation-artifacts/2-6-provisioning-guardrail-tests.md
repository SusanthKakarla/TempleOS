---
baseline_commit: ab27941
created_at: 2026-07-19T01:10:00+0530
story_generation_note: "Created from bmad-create-story for explicitly requested Story 2.6, before Amelia implementation."
---

# Story 2.6: Provisioning Guardrail Tests

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want tests for transactionality, duplicate handling, authorization, audit logging, WhatsApp uniqueness, and `getPilotTenant()` exclusion,
so that provisioning is safe before broader operations are added.

## Acceptance Criteria

1. Given provisioning tests run with valid input, when `provisionTemple` completes, then the test verifies tenant, domain, person, membership, role assignments, optional WhatsApp mapping, and audit log entry are all created together and the returned result matches persisted data.
2. Given provisioning tests simulate a mid-transaction failure, when the service throws, then the test verifies no partial tenant setup remains committed and audit logging does not claim a successful provisioning.
3. Given duplicate person, hostname, and Meta phone number ID scenarios are tested, when provisioning handles each case, then duplicate person phone is reused safely and duplicate hostname or cross-tenant Meta phone number ID returns conflict.
4. Given authorization tests call Super Admin provisioning routes, when unauthenticated users or tenant admins attempt provisioning, then the route rejects them and only active super admins can call the canonical provisioning path through the API.
5. Given code or tests scan new provisioning paths, when the provisioning service, API, and CLI are checked, then no new production provisioning path calls `getPilotTenant()` and the old pilot-only lookup remains outside this slice's production setup path.

## Tasks / Subtasks

- [x] Harden the canonical provisioning transaction tests. (AC: 1, 2, 3)
  - [x] Keep coverage in `lib/provisioning/temples.test.ts`; do not add a second provisioning service or a DB-only integration harness unless required by an uncovered behavior.
  - [x] Prove the successful call uses one checked-out client for tenant, domain, person, membership, roles, optional WhatsApp, and audit writes, then commits and releases.
  - [x] Assert the returned `ProvisionTempleResult` matches the created tenant, domain, first membership, assigned roles, and WhatsApp account.
  - [x] Simulate a failure after earlier writes but before audit logging; assert `ROLLBACK` and `release()` happen, `COMMIT` does not happen, and `createAuditLogEntry()` is not called.
  - [x] Simulate audit-log failure after entity writes; assert rollback still happens and the service returns a stable provisioning failure rather than a success.
  - [x] Keep rollback-failure behavior stable: preserve the original stable provisioning error and still release the client.

- [x] Expand duplicate and uniqueness guardrails. (AC: 3)
  - [x] Cover existing-person reuse by `findOrCreatePersonByPhoneForProvisioning()` and prove membership creation receives the existing `personId`.
  - [x] Cover duplicate tenant slug, duplicate hostname, duplicate `tenant_id + person_id` membership, duplicate tenant WhatsApp account, and duplicate Meta phone number ID constraint mappings.
  - [x] For duplicate hostname and duplicate Meta phone number ID, assert the service rolls back and exposes stable fields `domain.hostname` and `whatsappAccount.metaPhoneNumberId`.
  - [x] Do not test direct SQL constraint names in API/CLI output; stable fields are the contract.

- [x] Harden Super Admin provisioning API authorization tests. (AC: 4)
  - [x] Keep coverage in `app/api/super-admin/temples/route.test.ts`.
  - [x] Prove unauthenticated requests return `401` without parsing input or calling `provisionTemple()`.
  - [x] Prove tenant-admin sessions return `403` without parsing input or calling `provisionTemple()`.
  - [x] Prove an active super admin calls `parseProvisionTempleInput()` and then `provisionTemple()` with actor `{ type: "super_admin", superAdminId, phoneNumber, displayName }`.
  - [x] Keep stable validation, conflict, and 500 leak-prevention assertions from Story 2.3.

- [x] Consolidate static production-path guardrails. (AC: 5)
  - [x] Add or extend a focused static test that scans `lib/provisioning/temples.ts`, `app/api/super-admin/temples/route.ts`, and `scripts/provision-temple.mts`.
  - [x] Assert those production paths do not import or reference `getPilotTenant`, `admin_users`, `admin-users`, `upsertAdminUser`, tenant dashboard session helpers, or direct multi-table provisioning sequences outside `lib/provisioning/temples.ts`.
  - [x] Assert the API and CLI import `@/lib/provisioning/temples` and call the canonical parser/service rather than repository writes.
  - [x] Leave historical local seed scripts alone unless they are being used as production provisioning paths.

- [x] Verify the story. (AC: 1, 2, 3, 4, 5)
  - [x] Run `npm run test -- lib/provisioning/temples.test.ts app/api/super-admin/temples/route.test.ts scripts/provision-temple.test.ts scripts/seed-bootstrap.test.ts`.
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.
  - [x] Run `git diff --check`.

### Review Findings

- [x] [Review][Patch] Static provisioning-path guardrails are too narrow [scripts/seed-bootstrap.test.ts:62]
- [x] [Review][Defer] Role-assignment unique conflicts have no dedicated stable field test [lib/provisioning/temples.test.ts:598] - deferred, pre-existing

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 2.6.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `IMPLEMENTATION-PLAN.md` as the governing architecture.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` is stale for this slice where it excludes Super Admin. Story 2.6 follows the July 18 Super Admin architecture and Epic 2.
- No `project-context.md` file is present in this checkout.

### Current State To Build On

- `lib/provisioning/temples.ts` is the canonical provisioning service. It already exports `parseProvisionTempleInput()`, `provisionTemple()`, `ProvisionTempleError`, DTO types, `PRODUCT_DOMAIN`, and reserved subdomain helpers.
- `provisionTemple()` defensively re-parses input, requires a super-admin actor, opens one `pg` transaction client, writes tenant/domain/person/membership/roles/optional WhatsApp/audit, commits on success, rolls back on failure, and maps unique violations to stable fields.
- `lib/provisioning/temples.test.ts` already mocks repositories and covers validation, canonical transaction call order, rollback, existing-person reuse, stable conflicts, and source scanning. Story 2.6 should harden the missing guardrail edges instead of replacing these tests.
- `app/api/super-admin/temples/route.ts` calls `requireSuperAdmin()` before reading JSON, validation, or service mutation. It checks tenant cookies only to return `403` instead of `401` when a tenant admin tries the route.
- `app/api/super-admin/temples/route.test.ts` already covers success, invalid JSON, validation, unauthenticated, tenant-admin forbidden, conflict, and leak-safe 500 responses.
- `scripts/provision-temple.mts` is the production CLI wrapper added in Story 2.5. It maps flags/env into raw canonical input, builds an explicit super-admin actor, calls `parseProvisionTempleInput()` and `provisionTemple()`, and closes the shared pool only after service usage.
- `scripts/provision-temple.test.ts` already covers CLI parsing, env fallbacks, optional WhatsApp omission, partial WhatsApp rejection, actor requirements, safe output, conflicts, pool cleanup, and CLI static guardrails.
- `scripts/seed-bootstrap.test.ts` currently guards bootstrap scripts and can host broader production-path source scans if that stays clearer than adding a new file.

### Architecture Compliance

- AD-1: Tenant-admin roles must never satisfy Super Admin provisioning authorization.
- AD-2: All cross-boundary provisioning writes go through `lib/provisioning/temples.ts`.
- AD-4: New production provisioning paths must not call `getPilotTenant()`.
- AD-6: Successful privileged provisioning must produce one durable audit entry; failures and rollbacks must not claim success.
- AD-9: API and CLI inputs map into canonical service DTOs before mutation.
- AD-11: WhatsApp ownership is single-tenant and non-transferable in V0.
- AD-12: Existing global `persons` are reused by phone; tenant permissions remain in memberships and roles.
- AD-19: Tenant domains store full normalized hostnames, and stable conflict fields should point to `domain.hostname`.

### File Structure Requirements

- UPDATE: `lib/provisioning/temples.test.ts` for service transaction, duplicate, rollback, and audit guardrails.
- UPDATE: `app/api/super-admin/temples/route.test.ts` only if authorization or active-super-admin coverage needs tightening.
- UPDATE: `scripts/provision-temple.test.ts` and/or `scripts/seed-bootstrap.test.ts` for static production-path guardrails.
- Avoid production code changes unless a guardrail exposes a real bug. This story is primarily test hardening.
- Do not add live Postgres, Firebase, Meta, Railway, browser, or Next dev server requirements.
- Do not add new dependencies.

### Testing Requirements

- Follow the current Vitest style with `vi.mock()` for service/repository isolation.
- Use official Vitest module mocking patterns: mocked modules are registered before imports, and dynamic imports can improve TypeScript validation where practical. [Source: https://vitest.dev/guide/mocking/modules.html]
- Follow `node-postgres` transaction guidance: all statements inside a transaction must use the same checked-out client; do not test transaction behavior through `pool.query()`. [Source: https://node-postgres.com/features/transactions]
- Static guardrails should use `node:fs` and source scanning, consistent with existing tests.
- Tests should be deterministic and should not require a live database.

### Previous Story Intelligence

- Story 2.1 established canonical DTO parsing and static guardrails against pilot/admin footguns.
- Story 2.2 implemented `provisionTemple()` transactionality, rollback, stable conflict mapping, existing-person reuse, non-reassigning WhatsApp linkage, and audit logging.
- Story 2.3 implemented the API route and leak-safe error handling.
- Story 2.4 implemented the UI caller and should not be pulled into service/API/CLI tests.
- Story 2.5 implemented `provision:temple` and explicitly deferred broader transaction, authorization, and production-path guardrail coverage to Story 2.6.

### Git Intelligence

- Recent commits:
  - `ab27941 Implement provision temple CLI`
  - `dbc9389 Implement super admin new temple form`
  - `a018a63 Implement super admin temple provisioning API`
  - `b6de425 Implement temple provisioning transaction`
  - `1fa72ae Implement canonical temple provisioning contract`
- Baseline at story creation: `ab27941`.
- Worktree was clean at story creation.

### Latest Technical Information

- Use the repo-locked stack from `package.json`: Next.js `16.2.10`, React `19.2.4`, TypeScript, `pg` `^8.22.0`, Zod `^4.4.3`, `tsx` `^4.23.1`, and Vitest `^4.1.10`.
- No new library is justified for this test story.
- The relevant latest guidance is transaction discipline for `pg` and module mocking discipline for Vitest; both align with the existing implementation.

### Non-Goals

- Do not build another provisioning service.
- Do not add Super Admin temple list/detail/update, role governance, tenant member management, or tenant dashboard work.
- Do not add public signup, billing, approval queue, tenant switching, tenant deletion, tenant transfer, impersonation, data export, Meta embedded signup, webhook auto-registration, template approval, tenant-owned WhatsApp self-serve setup, WhatsApp transfer, or WhatsApp disconnect.
- Do not revive `admin_users`.
- Do not use `getPilotTenant()` for production provisioning.
- Do not turn this into a live database integration suite unless a mocked unit test cannot prove a required guardrail.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.6-Provisioning-Guardrail-Tests]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2-Super-Admin-Temple-Provisioning]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-2---Provisioning-has-one-canonical-mutation-path]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-4---Pilot-only-lookup-must-not-provision-production-tenants]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-6---Privileged-writes-must-use-one-audit-log]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-9---Provisioning-DTOs-are-canonical-service-contracts]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-6---Guardrails-And-Tests]
- [Source: _bmad-output/implementation-artifacts/2-5-provision-temple-cli.md#Previous-Story-Intelligence]
- [Source: lib/provisioning/temples.ts]
- [Source: lib/provisioning/temples.test.ts]
- [Source: app/api/super-admin/temples/route.ts]
- [Source: app/api/super-admin/temples/route.test.ts]
- [Source: scripts/provision-temple.mts]
- [Source: scripts/provision-temple.test.ts]
- [Source: scripts/seed-bootstrap.test.ts]
- [Source: package.json]
- [Source: https://vitest.dev/guide/mocking/modules.html]
- [Source: https://node-postgres.com/features/transactions]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Baseline focused guardrail run before implementation: `npm run test -- lib/provisioning/temples.test.ts app/api/super-admin/temples/route.test.ts scripts/provision-temple.test.ts scripts/seed-bootstrap.test.ts` - passed, 4 files / 45 tests.
- Focused guardrail run after implementation: `npm run test -- lib/provisioning/temples.test.ts scripts/seed-bootstrap.test.ts app/api/super-admin/temples/route.test.ts scripts/provision-temple.test.ts` - passed, 4 files / 50 tests.
- Full regression suite: `npm run test` - passed, 40 files / 280 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `git diff --check` - passed.
- Code review focused run after patch: `npm run test -- scripts/seed-bootstrap.test.ts lib/provisioning/temples.test.ts app/api/super-admin/temples/route.test.ts scripts/provision-temple.test.ts` - passed, 4 files / 50 tests.
- Code review full regression suite after patch: `npm run test` - passed, 40 files / 280 tests.
- `npm run typecheck` - passed after code review patch.
- `npm run lint` - passed after code review patch.
- `git diff --check` - passed after code review patch.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added audit-failure transaction guardrails proving entity writes do not commit when audit logging fails.
- Added no-success-audit assertions for mid-transaction failure paths.
- Added duplicate membership and duplicate tenant WhatsApp linkage conflict-field coverage.
- Added static production-path scans for service, API, and CLI provisioning entrypoints to keep them off pilot and legacy admin paths.
- No production code changes were required; existing implementation already satisfied the expanded guardrails.
- Code review patch applied: widened API/CLI static guardrails to block direct DB access, direct audit/provisioning helpers, and case-insensitive provisioning SQL.

### File List

- `_bmad-output/implementation-artifacts/2-6-provisioning-guardrail-tests.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `lib/provisioning/temples.test.ts`
- `scripts/seed-bootstrap.test.ts`
- `_bmad-output/implementation-artifacts/deferred-work.md`

## Change Log

- 2026-07-19: Created Story 2.6 context file and marked ready for dev.
- 2026-07-19: Implemented Story 2.6 provisioning guardrail tests and moved story to review.
- 2026-07-19: Applied code review patch for static provisioning-path guardrail breadth.
