---
baseline_commit: 294d9f8
created_at: 2026-07-18T23:13:59+0530
story_generation_note: "Explicitly requested as Story 2.1 using bmad-create-story and bmad-agent-dev."
---

# Story 2.1: Define Canonical Provisioning Contract

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform developer,
I want canonical provisioning DTOs and validation for tenant, domain, first member, roles, and optional WhatsApp account,
so that UI, API, and CLI all create the same tenant shape.

## Acceptance Criteria

1. Given provisioning input is accepted by API, UI, or CLI, when the input is mapped into the service layer, then it uses a canonical `ProvisionTempleInput` shape with `tenant`, `domain`, `firstMember`, `roles`, and optional `whatsappAccount`, and UI-shaped payloads do not leak directly into repository calls.
2. Given a provisioning request includes a subdomain slug, when validation runs, then the slug is checked for allowed characters and reserved names, and the stored domain is composed as a full normalized hostname.
3. Given a provisioning request includes first member roles, when validation runs, then the roles must include `admin`, and every supplied role must match an active V0 role definition.
4. Given a provisioning request includes phone numbers, when validation runs, then tenant contact, first member, and optional WhatsApp phone values are normalized before persistence, and invalid phone input produces a `400` validation response.

## Tasks / Subtasks

- [x] Create the canonical provisioning contract module. (AC: 1)
  - [x] Add `lib/provisioning/temples.ts`.
  - [x] Export `ProvisionTempleInput`, `ProvisionTempleResult`, `ProvisionTempleActor`, and `LinkWhatsAppAccountInput`.
  - [x] Keep the canonical input shape exactly domain-named: `tenant`, `domain`, `firstMember`, `roles`, and optional `whatsappAccount`.
  - [x] Do not implement the multi-table `provisionTemple()` transaction in this story; Story 2.2 owns mutation and rollback behavior.
  - [x] If a function is exported in this story, make it validation-only, such as `parseProvisionTempleInput(raw)` or `validateProvisionTempleInput(raw)`.

- [x] Add validation for tenant and domain input. (AC: 1, 2)
  - [x] Use Zod; do not add a new validation library.
  - [x] Validate tenant fields: `name`, `slug`, optional `defaultContactPhone`, optional `address`, and `timezone`.
  - [x] Surface the current schema gap clearly in code/tests: architecture expects `tenant.slug`, but `migrations/001_initial_schema.sql` currently has no `tenants.slug` column. Do not silently drop `tenant.slug`.
  - [x] Validate `domain.subdomain` with a single helper or constant-owned rule for lowercase letters, numbers, and hyphens.
  - [x] Reject reserved subdomains at minimum: `www`, `admin`, `super-admin`, `api`, and product/apex host equivalents.
  - [x] Compose the stored hostname as a full host such as `svtemple.trytempleos.com`, then run it through `normalizeTenantHostname()`.
  - [x] Reject generated generic hosts by using `isGenericTenantHostname()`.

- [x] Add validation for first member and role input. (AC: 1, 3, 4)
  - [x] Normalize `firstMember.phoneNumber` with `normalizePhoneNumber()` from `lib/phone.mts`.
  - [x] Require `firstMember.displayName`.
  - [x] Require `firstMember.roles` to include `admin`.
  - [x] Validate every role with `isRoleCode()` / `ROLE_CODES` from `types/db.ts`.
  - [x] Deduplicate role codes while preserving a stable output order.
  - [x] Do not create `persons`, `tenant_memberships`, or `tenant_membership_roles` in this story.

- [x] Add validation for optional WhatsApp input. (AC: 1, 4)
  - [x] Normalize `whatsappAccount.phoneNumber` with `normalizePhoneNumber()` when provided.
  - [x] Require `metaPhoneNumberId` and `metaBusinessAccountId` only when `whatsappAccount` exists.
  - [x] Keep WhatsApp linkage optional and manual/operator-managed.
  - [x] Do not call current `upsertWhatsAppAccount()` from `lib/db/whatsapp-accounts.ts`; it can reassign an existing Meta phone number ID and is not safe for provisioning as-is.

- [x] Define route/CLI error mapping without building the route or CLI yet. (AC: 1, 2, 3, 4)
  - [x] Export a validation result or error shape that future `POST /api/super-admin/temples` can map to `400`.
  - [x] Include field paths so Story 2.4 form handling can show field-level or section-level errors.
  - [x] Do not return `409` from validation-only code; duplicate hostname, duplicate tenant slug, and duplicate Meta phone number ID conflicts belong to Story 2.2 persistence checks.

- [x] Add focused tests. (AC: 1, 2, 3, 4)
  - [x] Add `lib/provisioning/temples.test.ts`.
  - [x] Prove valid raw API/UI/CLI-shaped input maps into canonical `ProvisionTempleInput`.
  - [x] Prove UI-only or form-only keys are not passed through to the canonical output.
  - [x] Prove reserved and malformed subdomains are rejected.
  - [x] Prove full hostname composition uses `*.trytempleos.com` and normalizes through the existing tenant hostname helper.
  - [x] Prove first member roles must include `admin`.
  - [x] Prove unknown role codes are rejected.
  - [x] Prove tenant contact, first member, and optional WhatsApp phones normalize to E.164.
  - [x] Prove invalid phone input produces validation failure that a route can map to `400`.
  - [x] Add a static guardrail that `lib/provisioning/temples.ts` does not import `getPilotTenant`, `admin-users`, `admin_users`, tenant dashboard auth helpers, or super-admin route code.

- [x] Verify implementation. (AC: 1, 2, 3, 4)
  - [x] Run `npm run test -- lib/provisioning/temples.test.ts`.
  - [x] Run `npm run test`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.

### Review Findings

- [x] [Review][Patch] Validate tenant timezone as a real IANA timezone [`lib/provisioning/temples.ts:84`]
- [x] [Review][Patch] Accept explicit null for optional WhatsApp input and normalize it to omission [`lib/provisioning/temples.ts:94`]
- [x] [Review][Patch] Validate roles against active V0 role definitions, not only static role codes [`lib/provisioning/temples.ts:238`]
- [x] [Review][Patch] Reserve localhost as a tenant subdomain footgun [`lib/provisioning/temples.ts:8`]
- [x] [Review][Patch] Avoid exporting a mutable reserved-subdomain Set used by validation [`lib/provisioning/temples.ts:8`]
- [x] [Review][Patch] Prove hostname composition calls the shared normalizeTenantHostname helper [`lib/provisioning/temples.test.ts:54`]
- [x] [Review][Patch] Keep ProvisionTempleInput optional fields aligned with the story DTO [`lib/provisioning/temples.ts:36`]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 2.1.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `IMPLEMENTATION-PLAN.md` as the governing architecture.
- The older `templeos-mvp-prd.md` is stale where it says Super Admin is out of scope. For Epic 2, the Super Admin architecture supersedes that original MVP non-goal.
- Story 2.1 is a contract and validation story. It prepares the shape used by API, UI, CLI, and the later service implementation.

### Current State To Build On

- `lib/provisioning/` does not exist yet.
- `lib/db/tenants.ts` currently has `getPilotTenant()`, `getTenantById()`, and `updateTenant()`. It does not yet have `createTenant()` or super-admin list/detail functions.
- `migrations/001_initial_schema.sql` currently creates `tenants` without a `slug` column, while the architecture DTO includes `tenant.slug`. This must be flagged in Story 2.1 output and resolved before or during Story 2.2 persistence work.
- `lib/db/tenant-domains.ts` has `getActiveTenantDomainByHostname(rawHostname)` and uses `normalizeTenantHostname()` plus `isGenericTenantHostname()`.
- `lib/tenant-domains.ts` normalizes hostnames by trimming, lowercasing, parsing URL-like input, stripping path/query/port through `URL.hostname`, rejecting IP-like hosts, and rejecting generic hosts through a separate helper.
- `lib/db/persons.ts` has `findPersonByPhone()`, `getPersonById()`, and `bindPersonFirebaseUid()`. It normalizes with `normalizePhoneNumber()`.
- `lib/db/tenant-memberships.ts` loads active membership roles through active `role_definitions` and filters role codes through `isRoleCode()`.
- `lib/db/role-definitions.ts` defines `V0_ROLE_DEFINITIONS`, seeds exactly `admin`, `priest`, `committee_member`, `volunteer`, and `devotee`, and wraps role seeding in a `pg` transaction.
- `lib/db/whatsapp-accounts.ts` currently has `upsertWhatsAppAccount(tenantId, input)` with `ON CONFLICT (meta_phone_number_id) DO UPDATE`. Do not reuse it unchanged in provisioning because AD-11 requires no V0 reassignment of an existing Meta phone number ID.
- `types/db.ts` exports `ROLE_CODES`, `RoleCode`, `isRoleCode()`, `Tenant`, `TenantDomain`, `TenantMembership`, `WhatsAppAccount`, and related forward identity types.

### Required Canonical Contract

Target DTO from architecture:

```ts
interface ProvisionTempleInput {
  tenant: {
    name: string;
    slug: string;
    defaultContactPhone?: string | null;
    address?: string | null;
    timezone: string;
  };
  domain: {
    subdomain: string;
    hostname: string;
  };
  firstMember: {
    phoneNumber: string;
    displayName: string;
    roles: RoleCode[];
  };
  whatsappAccount?: LinkWhatsAppAccountInput;
}

interface LinkWhatsAppAccountInput {
  phoneNumber: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId: string;
}
```

Notes:

- `domain.hostname` may be a normalized derived output even if raw callers submit only `domain.subdomain`.
- `tenant.slug` is required by architecture and Epic 2 language, but not yet persisted by current schema. Do not ignore this mismatch.
- `roles` live under `firstMember.roles`; do not add role columns to `persons` or `tenant_memberships`.
- The canonical contract should be independent of UI form field names, CLI argument names, and API request shape.

### Architecture Compliance

- AD-2: `lib/provisioning/temples.ts` owns every mutation crossing tenant, person, membership, role, WhatsApp, and audit boundaries. Story 2.1 defines the contract; Story 2.2 implements the transaction.
- AD-4: new production provisioning must not call `getPilotTenant()`.
- AD-5: Super Admin provisioning is not public signup, billing, approval queue, tenant switching, Meta embedded signup, webhook auto-registration, or tenant-owned WhatsApp self-serve connection UI.
- AD-6: privileged writes need durable audit entries, but Story 2.1 should only shape the actor/result contract so Story 2.2 can write the audit log.
- AD-9: API and CLI inputs map into canonical TypeScript service DTOs before mutation. UI-shaped payloads must not leak into repository calls.
- AD-10: repository scopes must be visible in names and signatures. Do not create globally ambiguous write helpers for tenant-owned data.
- AD-11: WhatsApp account ownership is single-tenant and non-transferable in V0.
- AD-12: person identity is global; memberships and roles are tenant-scoped.
- AD-13: role definitions are platform-governed; assignments are tenant-governed.
- AD-18: V0 role seeds and capabilities are fixed.
- AD-19: `tenant_domains.hostname` stores full normalized hosts like `svtemple.trytempleos.com`, not just slugs.

### Library / Framework Requirements

- Use the current repo stack from `package.json`: Next.js `16.2.10`, React `19.2.4`, TypeScript, `pg` `^8.22.0`, Firebase JS SDK `^12.16.0`, Firebase Admin SDK `^14.2.0`, Zod `^4.4.3`, and Vitest `^4.1.10`.
- Latest official docs checked on 2026-07-18:
  - Next Route Handlers live in `app/**/route.ts`, support standard HTTP methods, and use Web Request/Response plus `NextRequest` / `NextResponse` helpers.
  - Next `cookies()` is async and cookie mutation belongs in Route Handlers or Server Functions. Story 2.1 should not need cookies directly.
  - Zod `.safeParse()` returns a discriminated result and `z.infer<>` derives TypeScript types from schemas.
  - Zod refinements should return truthy/falsy rather than throw.
  - `node-postgres` transactions must use one checked-out client for `BEGIN`, all statements, `COMMIT`/`ROLLBACK`, then `release()`. This matters for Story 2.2, not Story 2.1.
  - Vitest `vi.mock` is the established module-mocking tool; reset mocks between tests to avoid state leaks.
- Do not add Prisma, Drizzle, Auth.js/NextAuth, JWT libraries, policy engines, browser automation, or new validation/session dependencies.

### Testing Requirements

- Follow current Vitest style:
  - Repository tests mock `lib/db/pool.ts`.
  - Static guardrails use `node:fs`, `node:path`, `describe`, `it`, and `expect`.
  - Tests should be deterministic and not require live Postgres, Firebase, Meta, Railway, or browser automation.
- Story 2.1 tests should fail before implementation because `lib/provisioning/temples.ts` does not exist.
- Keep validation tests focused on normalized output and stable error paths. Do not make Story 2.1 tests assert database transaction behavior; Story 2.2 owns that.

### Previous Story Intelligence

- Epic 1 completed the forward identity/session spine and moved all six stories to `done`.
- Story 1.6 added explicit isolation guardrails in `app/api/identity-session-isolation.test.ts`.
- Tenant `admin` sessions cannot satisfy super-admin authorization.
- Tenant login derives session tenant/membership/roles from hostname-resolved `tenant_domains`, ignoring client-supplied tenant IDs.
- Live tenant session reads reject membership tenant mismatches, so Temple A role codes cannot authorize Temple B session reads.
- Apex and `www` product hosts cannot create tenant sessions; local host override is rejected in production before lookup/cookie creation.
- Keep these boundaries intact when provisioning starts creating new `tenant_domains`, `persons`, and memberships.

### Git Intelligence

- Recent relevant commits:
  - `294d9f8 tests`
  - `5e593d8 Enforce tenant admin dashboard access`
  - `2ad9082 Implement super admin phone OTP session`
  - `60a33cb Seed roles and first super admin`
  - `16e494c udpating plan`
- Current branch state at story creation: `main` ahead of `origin/main` by 5 commits.
- Do not assume remote `origin/main` contains Epic 1 implementation until pushed.

### Non-Goals

- Do not implement `provisionTemple()` persistence or transactionality in this story.
- Do not create tenant, person, membership, role assignment, WhatsApp account, or audit rows in this story.
- Do not add `POST /api/super-admin/temples`; Story 2.3 owns the API.
- Do not build `/super-admin/temples/new`; Story 2.4 owns the UI.
- Do not add `scripts/provision-temple.mts`; Story 2.5 owns the CLI.
- Do not use `getPilotTenant()` for any new production provisioning path.
- Do not revive `admin_users`.
- Do not create public signup, billing, approval queues, tenant switching, tenant deletion, tenant transfer, impersonation, data export, Meta embedded signup, webhook auto-registration, template approval workflows, or tenant-owned WhatsApp self-serve connection UI.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.1-Define-Canonical-Provisioning-Contract]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2-Super-Admin-Temple-Provisioning]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-2---Provisioning-has-one-canonical-mutation-path]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-9---Provisioning-DTOs-are-canonical-service-contracts]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-11---WhatsApp-account-ownership-is-single-tenant-and-non-transferable-in-V0]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-19---Tenant-domain-stores-full-normalized-hostnames]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-2---Canonical-Provisioning]
- [Source: _bmad-output/implementation-artifacts/1-6-identity-and-session-isolation-tests.md#Completion-Notes-List]
- [Source: https://nextjs.org/docs/app/getting-started/route-handlers]
- [Source: https://nextjs.org/docs/app/api-reference/functions/cookies]
- [Source: https://node-postgres.com/features/transactions]
- [Source: https://zod.dev/basics]
- [Source: https://zod.dev/api]
- [Source: https://vitest.dev/guide/mocking/modules.html]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- lib/provisioning/temples.test.ts` - RED failed as expected because `lib/provisioning/temples.ts` did not exist.
- `npm run test -- lib/provisioning/temples.test.ts` - passed, 1 file / 7 tests.
- `npm run test` - passed, 36 files / 226 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- Code review - 0 decision-needed, 7 patch, 0 defer, 2 dismissed; all patches applied.
- `npm run test -- lib/provisioning/temples.test.ts` - passed after review patches, 1 file / 9 tests.
- `npm run test` - passed after review patches, 36 files / 228 tests.
- `npm run typecheck` - passed after review patches.
- `npm run lint` - passed after review patches.
- `git diff --check` - passed after review patches.

### Implementation Plan

- Added a validation-only `lib/provisioning/temples.ts` contract module for Story 2.1.
- Kept persistence, transactionality, API route, UI, CLI, and audit writes out of this story per Epic 2 sequencing.
- Used Zod plus existing `normalizePhoneNumber()`, `normalizeTenantHostname()`, `isGenericTenantHostname()`, and `isRoleCode()` helpers.
- Preserved `tenant.slug` in the canonical contract and exposed the current schema gap through `TENANT_SLUG_PERSISTENCE_GAP`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented canonical provisioning DTOs and validation result types.
- Implemented `parseProvisionTempleInput(raw)` with field-path validation errors and route-mappable `400` status metadata.
- Validated tenant name, slug, optional contact phone, address, timezone, subdomain, first member phone/display name/roles, and optional WhatsApp account details.
- Composed full tenant hostnames as `*.trytempleos.com` and normalized them through existing tenant-domain helpers.
- Enforced reserved subdomain rejection, active V0 role validation, and first-member `admin` role requirement.
- Applied code review patches for IANA timezone validation, explicit null WhatsApp omission, `localhost` reservation, immutable reserved-name exports, optional DTO fields, and hostname helper proof.
- Added static guardrails preventing Story 2.1 provisioning contract code from importing pilot lookup, legacy admin auth, tenant dashboard auth, super-admin routes, or unsafe WhatsApp upsert behavior.

### File List

- `lib/provisioning/temples.ts`
- `lib/provisioning/temples.test.ts`
- `_bmad-output/implementation-artifacts/2-1-define-canonical-provisioning-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-18: Implemented Story 2.1 canonical provisioning contract and validation; moved story to review.
- 2026-07-18: Applied code review patches and moved Story 2.1 to done.
