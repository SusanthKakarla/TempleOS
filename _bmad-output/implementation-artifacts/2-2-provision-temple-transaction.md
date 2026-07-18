---
baseline_commit: 1fa72ae16ab569cafcd05942fed96237f7f7a6cb
created_at: 2026-07-18T23:38:30+0530
story_generation_note: "Explicitly requested as Story 2.2 using bmad-create-story before bmad-agent-dev."
---

# Story 2.2: Provision Temple Transaction

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a super admin,
I want temple provisioning to create the tenant, domain, first person, first membership, role assignments, optional WhatsApp account, and audit record atomically,
so that partial setup cannot leave a broken temple.

## Acceptance Criteria

1. Given valid provisioning input and an authorized super-admin actor, when `provisionTemple(input, actor)` runs, then it creates the tenant, tenant domain, first person, first tenant membership, first member role assignments, optional WhatsApp account, and audit log entry in one transaction, and it returns a `ProvisionTempleResult` containing the created tenant, domain, first member, roles, and WhatsApp account if provided.
2. Given the first member phone already maps to an existing `person`, when provisioning runs, then the existing person is reused, and only one membership is created for that person and tenant.
3. Given any required write fails during provisioning, when the transaction exits, then no partial tenant, domain, membership, role assignment, WhatsApp account, or audit entry remains committed, and the caller receives a stable error response.
4. Given a requested hostname or unique tenant slug already exists, when provisioning runs, then the operation returns a `409` conflict, and it does not create a duplicate tenant shape.
5. Given optional WhatsApp details are supplied, when the Meta phone number ID is already linked to another tenant, then provisioning rejects the request with `409`, and the existing WhatsApp account ownership is not reassigned.

## Tasks / Subtasks

- [x] Add forward schema support required by provisioning. (AC: 1, 3, 4)
  - [x] Add a migration that persists `tenants.slug` as a unique normalized tenant slug; do not keep relying on `TENANT_SLUG_PERSISTENCE_GAP`.
  - [x] Add the durable `audit_log` table required by AD-6 with actor, tenant, action, target, timestamp, and metadata columns.
  - [x] Add or update migration/schema tests proving `tenants.slug` uniqueness and `audit_log` existence.
  - [x] Update `types/db.ts` so `Tenant` includes `slug` and add an `AuditLogEntry` type if useful for repository results.

- [x] Add transaction-capable repository helpers without weakening existing query boundaries. (AC: 1, 2, 4, 5)
  - [x] Extend repository functions to accept an optional transaction client where Story 2.2 needs all writes on the same checked-out client.
  - [x] Add `createTenantForSuperAdmin` or an equivalently scoped tenant create helper; include `slug`, contact phone, address, and timezone.
  - [x] Add `createTenantDomainForSuperAdmin` or a scoped tenant-domain create helper that writes the full normalized hostname already produced by validation.
  - [x] Add `findOrCreatePersonByPhoneForProvisioning` or equivalent; reuse an existing `person` by normalized phone and create only when absent.
  - [x] Add `createTenantMembershipForProvisioning` and role assignment helpers that create one membership for the new tenant/person and assign active role definitions by role code.
  - [x] Add a provisioning-safe WhatsApp link helper; do not call `upsertWhatsAppAccount()` because it can reassign an existing `meta_phone_number_id`.
  - [x] Add an audit-log write helper for privileged provisioning.

- [x] Implement `provisionTemple(input, actor)` in `lib/provisioning/temples.ts`. (AC: 1, 2, 3, 4, 5)
  - [x] Use the Story 2.1 `ProvisionTempleInput`, `ProvisionTempleActor`, and `ProvisionTempleResult` shapes.
  - [x] Validate or require already-parsed canonical input; do not let UI-shaped payloads reach repository writes.
  - [x] Open one `pg` client with `getPool().connect()`, run `BEGIN`, perform all provisioning statements through that client, `COMMIT` on success, `ROLLBACK` on failure, and always `release()`.
  - [x] Create records in this order unless tests show a clearer dependency order: tenant, tenant domain, person, tenant membership, role assignments, optional WhatsApp account, audit log.
  - [x] Return the created tenant, domain, first membership with roles, role codes, and `whatsappAccount` or `null`.
  - [x] Map duplicate slug, duplicate hostname, duplicate tenant/person membership, duplicate tenant WhatsApp account, and duplicate Meta phone number ID to a stable `409` conflict error/result.
  - [x] Map non-conflict persistence failures to a stable service error while preserving rollback.

- [x] Preserve security and scope guardrails. (AC: 1, 3, 5)
  - [x] Require `actor.type === "super_admin"` and a `superAdminId`; do not import tenant dashboard auth helpers.
  - [x] Do not call `getPilotTenant()`, `admin_users`, `admin-users`, tenant admin session helpers, API route modules, or UI modules from provisioning service code.
  - [x] Do not add public signup, billing, approval queues, tenant switching, tenant deletion, tenant transfer, impersonation, data export, Meta embedded signup, webhook auto-registration, template approval, or tenant-owned WhatsApp self-serve connection UI.

- [x] Add focused tests for transaction behavior and guardrails. (AC: 1, 2, 3, 4, 5)
  - [x] Extend `lib/provisioning/temples.test.ts` or add `lib/provisioning/provision-temple.test.ts`.
  - [x] Prove successful provisioning calls `BEGIN`, creates every required shape, writes audit, commits, releases the client, and returns `ProvisionTempleResult`.
  - [x] Prove an existing person phone is reused and the membership is for the new tenant/person only.
  - [x] Prove a mid-transaction write failure rolls back, releases the client, and returns or throws the stable service error.
  - [x] Prove duplicate tenant slug and duplicate hostname map to `409`.
  - [x] Prove duplicate `meta_phone_number_id` linked to another tenant maps to `409` without any `ON CONFLICT DO UPDATE` reassignment.
  - [x] Add a static guardrail that `lib/provisioning/temples.ts` still does not import `getPilotTenant`, `admin-users`, `admin_users`, tenant dashboard auth helpers, super-admin route code, or `upsertWhatsAppAccount`.

- [x] Verify implementation. (AC: 1, 2, 3, 4, 5)
  - [x] Run `npm run test -- lib/provisioning/temples.test.ts`.
  - [x] Run any new migration/schema tests.
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.

### Review Findings

- [x] [Review][Patch] Role assignment can silently under-provision requested roles [`lib/db/tenant-memberships.ts:92`]
- [x] [Review][Patch] Existing-person reuse behavior is not directly proven by tests [`lib/provisioning/temples.test.ts:375`]
- [x] [Review][Patch] Stale tenant slug persistence gap constant remains after schema support was added [`lib/provisioning/temples.ts:28`]
- [x] [Review][Patch] Tenant slug migration can fail on duplicate or overlong backfilled slugs [`migrations/006_super_admin_provisioning.sql:8`]
- [x] [Review][Patch] WhatsApp tenant uniqueness migration can fail on existing duplicate tenant rows and regress `upsertWhatsAppAccount()` [`migrations/006_super_admin_provisioning.sql:25`]
- [x] [Review][Patch] Rollback failure can mask the stable provisioning error contract [`lib/provisioning/temples.ts:301`]
- [x] [Review][Patch] `provisionTemple()` can be called with an unparsed object at runtime despite the canonical-input contract [`lib/provisioning/temples.ts:229`]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 2.2.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `IMPLEMENTATION-PLAN.md` as the governing architecture.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` is stale where it says Super Admin is out of scope. Epic 2 follows the July 18 Super Admin architecture.
- No `project-context.md` file was present during story creation.

### Current State To Build On

- `lib/provisioning/temples.ts` currently contains the Story 2.1 canonical contract and validation-only `parseProvisionTempleInput(raw)`.
- `ProvisionTempleInput` already includes `tenant`, `domain`, `firstMember`, and optional `whatsappAccount`; `domain.hostname` is a normalized derived output.
- `ProvisionTempleResult` already expects `tenant: Tenant`, `domain: TenantDomain`, `firstMember: TenantMembershipWithRoles`, `roles: RoleCode[]`, and `whatsappAccount: WhatsAppAccount | null`.
- `TENANT_SLUG_PERSISTENCE_GAP` documents that the current schema does not persist `tenants.slug`; Story 2.2 must close this gap before enforcing duplicate slug conflicts.
- `migrations/001_initial_schema.sql` has `tenants` without `slug` and has no `audit_log` table. Add a new migration rather than rewriting history unless the user explicitly chooses a reset-only migration rewrite.
- `lib/db/tenants.ts` has `getPilotTenant()`, `getTenantById()`, and `updateTenant()`. Do not use `getPilotTenant()` in provisioning. Add a scoped create helper instead.
- `lib/db/tenant-domains.ts` has `getActiveTenantDomainByHostname(rawHostname)` only. Add a scoped create helper for the provisioning transaction.
- `lib/db/persons.ts` has `findPersonByPhone()`, `getPersonById()`, and `bindPersonFirebaseUid()`. Add a transaction-aware find-or-create path for provisioning.
- `lib/db/tenant-memberships.ts` has read helpers only. Add transaction-aware create and role assignment helpers.
- `lib/db/role-definitions.ts` exposes `V0_ROLE_DEFINITIONS` and seed logic. Role assignment should resolve active role definitions by code inside the transaction.
- `lib/db/whatsapp-accounts.ts` has `upsertWhatsAppAccount()` with `ON CONFLICT (meta_phone_number_id) DO UPDATE`; do not reuse it for provisioning because AD-11 requires no V0 reassignment.
- `types/db.ts` currently has no `Tenant.slug` and no audit-log type.

### Architecture Compliance

- AD-2: `lib/provisioning/temples.ts` owns every mutation crossing tenant, person, membership, role, WhatsApp, and audit boundaries. API, UI, and CLI must call this service later.
- AD-4: new production provisioning must not call `getPilotTenant()`.
- AD-6: privileged writes must create durable `audit_log` entries.
- AD-9: canonical DTOs use domain names and require `firstMember.roles` to include `admin`.
- AD-10: repository scopes must be visible in names and signatures. Use super-admin/provisioning-scoped helper names for cross-tenant writes.
- AD-11: WhatsApp account ownership is single-tenant and non-transferable in V0.
- AD-12: person identity is global; memberships and roles are tenant-scoped.
- AD-13: role definitions are platform-governed; assignments are tenant-governed.
- AD-18: V0 role seeds and capabilities are fixed.
- AD-19: `tenant_domains.hostname` stores full normalized hosts like `svtemple.trytempleos.com`, not slugs.

### Error Contract Guidance

- Validation errors remain `400` from Story 2.1 validation.
- Duplicate unique keys required by this story map to `409`: tenant slug, tenant domain hostname, tenant/person membership, tenant WhatsApp account, and Meta phone number ID.
- Use PostgreSQL unique violation code `23505` as the low-level conflict signal, but expose a stable service-level shape such as `{ status: 409, code: "PROVISIONING_CONFLICT", field?: string }` or a typed error class with equivalent properties.
- Non-conflict persistence failures should roll back and surface a stable provisioning failure. Do not report success if the audit write fails; audit is part of the transaction.

### Latest Technical Information

- Official `node-postgres` transaction guidance says transactions are manual `BEGIN` / `COMMIT` / `ROLLBACK` statements and all statements in a transaction must use the same checked-out client. Do not use `pool.query` for statements inside this transaction. [Source: https://node-postgres.com/features/transactions]
- Vitest `vi.mock` remains the repo-compatible way to mock modules and transaction clients in unit tests; clear or reset mocks between tests to avoid state leaks. [Source: https://vitest.dev/guide/mocking/modules.html]

### Previous Story Intelligence

- Story 2.1 completed the canonical validation contract and left mutation, transactionality, API route, UI, CLI, and audit writes explicitly out of scope for Story 2.2.
- Story 2.1 review patches tightened IANA timezone validation, explicit null WhatsApp omission, active V0 role validation, `localhost` reservation, immutable reserved-name exports, optional DTO fields, and proof that hostname composition uses `normalizeTenantHostname()`.
- Story 2.1 static guardrails prevent provisioning code from importing pilot lookup, legacy admin auth, tenant dashboard auth, super-admin routes, or unsafe WhatsApp upsert behavior. Keep and extend those guardrails.
- Epic 1 completed the forward identity/session spine. Tenant `admin` sessions cannot satisfy super-admin authorization, and tenant login derives membership from hostname-resolved `tenant_domains`.

### Git Intelligence

- Recent commits at story creation:
  - `1fa72ae Implement canonical temple provisioning contract`
  - `294d9f8 tests`
  - `5e593d8 Enforce tenant admin dashboard access`
  - `2ad9082 Implement super admin phone OTP session`
  - `60a33cb Seed roles and first super admin`
- Working tree was clean at story creation.

### Non-Goals

- Do not add `POST /api/super-admin/temples`; Story 2.3 owns the API.
- Do not build `/super-admin/temples/new`; Story 2.4 owns the UI.
- Do not add `scripts/provision-temple.mts`; Story 2.5 owns the CLI.
- Do not revive `admin_users`.
- Do not implement tenant member management beyond first-member provisioning.
- Do not implement public signup, billing, approval queues, tenant switching, tenant deletion, tenant transfer, impersonation, data export, Meta embedded signup, webhook auto-registration, template approval workflows, or tenant-owned WhatsApp self-serve connection UI.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.2-Provision-Temple-Transaction]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2-Super-Admin-Temple-Provisioning]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-2---Provisioning-has-one-canonical-mutation-path]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-6---Privileged-writes-must-use-one-audit-log]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-9---Provisioning-DTOs-are-canonical-service-contracts]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-11---WhatsApp-account-ownership-is-single-tenant-and-non-transferable-in-V0]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-19---Tenant-domain-stores-full-normalized-hostnames]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-2---Canonical-Provisioning]
- [Source: _bmad-output/implementation-artifacts/2-1-define-canonical-provisioning-contract.md#Completion-Notes-List]
- [Source: https://node-postgres.com/features/transactions]
- [Source: https://vitest.dev/guide/mocking/modules.html]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- lib/provisioning/temples.test.ts migrations/identity-schema.test.ts` - RED failed on missing `tenants.slug`, missing `audit_log`, and missing provisioning/audit implementation.
- `npm run test -- lib/provisioning/temples.test.ts migrations/identity-schema.test.ts` - passed, 2 files / 19 tests.
- `npm run test` - passed, 36 files / 235 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `git diff --check` - passed.
- Code review - 0 decision-needed, 7 patch, 0 defer, 2 dismissed; all patches applied.
- `npm run test -- lib/provisioning/temples.test.ts lib/db/tenant-memberships.test.ts lib/db/whatsapp-accounts.test.ts migrations/identity-schema.test.ts` - passed after review patches, 4 files / 31 tests.
- `npm run typecheck` - passed after review patches.
- `npm run lint` - passed after review patches.
- `npm run test` - passed after review patches, 37 files / 241 tests.
- `git diff --check` - passed after review patches.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Started implementation from baseline commit `1fa72ae16ab569cafcd05942fed96237f7f7a6cb`.
- Added `tenants.slug` persistence and `audit_log` migration support for provisioning.
- Implemented transaction-capable repository helpers for tenant, domain, person, membership, role assignment, WhatsApp linkage, and audit writes.
- Implemented `provisionTemple(input, actor)` with one checked-out `pg` client, rollback on failure, stable `409` conflict mapping, and no unsafe WhatsApp reassignment.
- Added tests for successful transaction flow, rollback, duplicate slug, duplicate hostname, duplicate Meta phone number ID, schema guardrails, and static footgun exclusions.
- Applied code review patches for complete role-assignment verification, existing-person reuse coverage, runtime canonical input parsing, rollback error preservation, hardened slug/WhatsApp migration backfills, manual WhatsApp upsert compatibility, and removal of stale slug-gap guidance.

### File List

- `_bmad-output/implementation-artifacts/2-2-provision-temple-transaction.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `lib/db/audit-log.ts`
- `lib/db/persons.ts`
- `lib/db/query-client.ts`
- `lib/db/tenant-domains.ts`
- `lib/db/tenant-memberships.ts`
- `lib/db/tenant-memberships.test.ts`
- `lib/db/tenants.ts`
- `lib/db/whatsapp-accounts.ts`
- `lib/db/whatsapp-accounts.test.ts`
- `lib/provisioning/temples.test.ts`
- `lib/provisioning/temples.ts`
- `lib/whatsapp/templates.test.ts`
- `migrations/006_super_admin_provisioning.sql`
- `migrations/identity-schema.test.ts`
- `types/db.ts`

## Change Log

- 2026-07-18: Created Story 2.2 context file and marked ready for dev.
- 2026-07-18: Implemented Story 2.2 provisioning transaction and moved story to review.
- 2026-07-18: Applied code review patches and moved Story 2.2 to done.
