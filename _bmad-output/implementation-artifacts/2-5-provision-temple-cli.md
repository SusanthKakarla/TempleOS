---
baseline_commit: dbc9389
created_at: 2026-07-19T00:39:26+0530
story_generation_note: "Created from bmad-create-story for explicitly requested Story 2.5, with Amelia dev-readiness context loaded."
---

# Story 2.5: Provision Temple CLI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want a CLI command that provisions a temple through the same canonical service,
so that reset-time or scripted setup cannot drift from the UI path.

## Acceptance Criteria

1. Given a platform operator runs `provision:temple` with valid tenant, domain, first member, role, and optional WhatsApp inputs, when the command executes, then it maps arguments or environment values into the same canonical `ProvisionTempleInput` and calls `provisionTemple(input, actor)`.
2. Given required CLI inputs are missing or invalid, when the command validates input, then it exits non-zero and prints actionable missing-field or invalid-field information without printing secrets.
3. Given provisioning succeeds, when the command completes, then it prints the created tenant ID, hostname, first member phone, assigned roles, and WhatsApp linkage status and it does not require manual SQL follow-up.
4. Given older pilot seed scripts still exist, when the production provisioning command is inspected or tested, then it does not call `getPilotTenant()` and it requires an explicit tenant target or creates a tenant through the canonical service.

## Tasks / Subtasks

- [x] Add the production provisioning script and npm command. (AC: 1, 3, 4)
  - [x] Add `scripts/provision-temple.mts`.
  - [x] Add `"provision:temple": "tsx scripts/provision-temple.mts"` to `package.json`.
  - [x] Import `./load-env.mts` at the top of the script so `.env` and `.env.local` follow the current script loading pattern.
  - [x] Always close the shared pool with `getPool().end()` in `finally`, matching `scripts/seed-super-admin.mts`.
  - [x] Do not add a separate `.mjs` copy unless runtime testing proves `tsx` is not acceptable for this command.

- [x] Parse explicit CLI arguments and environment fallbacks into the canonical raw input. (AC: 1, 2)
  - [x] Support flags for tenant fields: `--tenant-name`, `--tenant-slug`, `--contact-phone`, `--address`, and `--timezone`.
  - [x] Support domain and first member flags: `--subdomain`, `--first-member-phone`, `--first-member-name`, and repeatable or comma-separated `--role` / `--roles`.
  - [x] Support optional WhatsApp flags: `--whatsapp-phone`, `--meta-phone-number-id`, and `--meta-business-account-id`.
  - [x] Support environment fallbacks with clear names such as `TEMPLE_NAME`, `TEMPLE_SLUG`, `TEMPLE_SUBDOMAIN`, `TEMPLE_CONTACT_PHONE`, `TEMPLE_ADDRESS`, `TEMPLE_TIMEZONE`, `FIRST_MEMBER_PHONE`, `FIRST_MEMBER_DISPLAY_NAME`, `FIRST_MEMBER_ROLES`, `WHATSAPP_PHONE_NUMBER`, `META_PHONE_NUMBER_ID`, and `META_BUSINESS_ACCOUNT_ID`.
  - [x] Default first member roles to include `admin` only if no role flag/env is supplied; never allow the final role list to omit `admin`.
  - [x] Omit `whatsappAccount` entirely when all optional WhatsApp inputs are blank; if any WhatsApp value is present, require all three before calling the service.

- [x] Require an explicit super-admin actor for audit attribution. (AC: 1, 4)
  - [x] Build a `ProvisionTempleActor` from CLI flags or env, not from tenant membership state.
  - [x] Support `--actor-super-admin-id`, `--actor-phone`, and `--actor-name`, with environment fallbacks such as `SUPER_ADMIN_ID`, `SUPER_ADMIN_PHONE_NUMBER`, and `SUPER_ADMIN_DISPLAY_NAME`.
  - [x] If the actor is missing, exit non-zero with a usage message; do not invent an actor, use an env-only pseudo-operator, or query tenant admin state.
  - [x] Use actor shape `{ type: "super_admin", superAdminId, phoneNumber, displayName }`.

- [x] Reuse the canonical provisioning service and stable error model. (AC: 1, 2, 3, 4)
  - [x] Call `parseProvisionTempleInput(raw)` before mutation and print validation paths/messages on failure.
  - [x] Call `provisionTemple(parsed.data, actor)` for successful validation.
  - [x] Handle `ProvisionTempleError` statuses: validation as invalid input, `409` as conflict, and `500` as provisioning failure.
  - [x] Do not sequence repository writes directly from the script.
  - [x] Do not call `createTenantForSuperAdmin`, `createTenantDomainForSuperAdmin`, `createTenantMembershipForProvisioning`, `linkWhatsAppAccountForProvisioning`, `getPilotTenant()`, `admin_users`, `admin-users`, tenant dashboard auth helpers, Super Admin route handlers, or UI helpers from the CLI.

- [x] Print operator-safe output. (AC: 2, 3)
  - [x] On success, print tenant ID, tenant slug, hostname, first member phone, assigned roles, and WhatsApp linkage status (`linked` / `not linked`).
  - [x] Do not print raw request JSON, Meta business account ID, Meta phone number ID, stack traces, SQL constraint names, database URLs, Firebase secrets, or full environment dumps.
  - [x] On validation failure, print stable field paths such as `tenant.name`, `domain.subdomain`, `firstMember.phoneNumber`, `firstMember.roles`, and `whatsappAccount.metaPhoneNumberId`.
  - [x] On conflict, print the stable `field` from `ProvisionTempleError` when present.

- [x] Add focused script tests and static guardrails. (AC: 1, 2, 3, 4)
  - [x] Add `scripts/provision-temple.test.ts` or another focused test location consistent with existing script tests.
  - [x] Test argument parsing for valid required inputs, environment fallbacks, comma-separated/repeatable roles, default `admin`, and optional WhatsApp omission.
  - [x] Test partial WhatsApp input exits non-zero before service mutation.
  - [x] Mock `parseProvisionTempleInput()` and `provisionTemple()` so tests do not require live Postgres, Firebase, Meta, Railway, or a running Next dev server.
  - [x] Prove success output includes tenant ID, hostname, first member phone, roles, and WhatsApp linkage status.
  - [x] Prove validation/conflict/failure output does not leak Meta IDs, SQL constraint names, stack traces, or raw input.
  - [x] Add or extend a static guardrail proving `scripts/provision-temple.mts` imports `@/lib/provisioning/temples`, calls `parseProvisionTempleInput()` and `provisionTemple()`, and avoids pilot/admin footguns and direct repository writes.

- [x] Verify the story. (AC: 1, 2, 3, 4)
  - [x] Run `npm run test -- scripts/provision-temple.test.ts`.
  - [x] Run `npm run test -- lib/provisioning/temples.test.ts scripts/seed-bootstrap.test.ts`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.
  - [x] Run `git diff --check`.

### Review Findings

- [x] [Review][Patch] Explicit blank flags fall back to stale environment values [scripts/provision-temple.mts:157]
- [x] [Review][Patch] Pool cleanup can mask the intended CLI result or validation error [scripts/provision-temple.mts:152]
- [x] [Review][Patch] Missing actor errors do not print a usage message [scripts/provision-temple.mts:199]
- [x] [Review][Patch] Unknown CLI flags are silently ignored [scripts/provision-temple.mts:34]
- [x] [Review][Patch] Failure-output leak coverage is incomplete [scripts/provision-temple.test.ts:340]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 2.5.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `IMPLEMENTATION-PLAN.md` as the governing architecture.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` is stale where it excludes Super Admin. Story 2.5 follows the July 18 Super Admin architecture and Epic 2.
- No `project-context.md` file is present in this checkout.

### Current State To Build On

- `lib/provisioning/temples.ts` owns the canonical provisioning contract and transaction. It exports `parseProvisionTempleInput(raw)`, `provisionTemple(input, actor)`, `ProvisionTempleError`, `PRODUCT_DOMAIN`, `RESERVED_TENANT_SUBDOMAINS`, and related DTO types.
- `parseProvisionTempleInput()` maps raw API/UI/CLI-shaped input into canonical `ProvisionTempleInput`, normalizes phone numbers, validates IANA timezones, normalizes tenant slug and subdomain, composes `domain.hostname`, enforces active V0 roles, and requires `firstMember.roles` to include `admin`.
- `provisionTemple()` re-parses runtime input defensively, requires `actor.type === "super_admin"` plus `superAdminId`, opens one `pg` transaction, creates tenant/domain/person/membership/roles/optional WhatsApp/audit entry, commits on success, rolls back on failure, releases the client, and maps unique violations to stable `ProvisionTempleError` fields.
- Current `package.json` has script patterns: `migrate` and `seed` use `tsx scripts/*.mts`; `seed:super-admin` currently points to `node scripts/seed-super-admin.mjs`.
- `scripts/load-env.mts` loads `.env` then `.env.local`; reuse it instead of reimplementing dotenv behavior.
- `scripts/seed-super-admin.mts` shows the TypeScript script cleanup pattern: import env, parse `--flag value`, call a repo/service, handle errors with `process.exitCode = 1`, and close `getPool().end()` in `finally`.
- `scripts/seed-super-admin.mjs` is a standalone production-compatible copy for first bootstrap. Do not copy its raw `pg` and phone parsing style into `provision-temple.mts`; the provisioning CLI must call the canonical TypeScript service.
- `scripts/seed-bootstrap.test.ts` already statically guards production bootstrap scripts against `admin_users`, `admin-users`, `upsertAdminUser`, `getPilotTenant`, and tenant membership misuse.

### Required CLI Contract

Recommended raw input assembled by the CLI before parsing:

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
  };
}
```

Required actor:

```ts
{
  type: "super_admin";
  superAdminId: string;
  phoneNumber: string;
  displayName: string;
}
```

The script should then run:

```ts
const parsed = parseProvisionTempleInput(rawInput);
if (!parsed.ok) {
  // print field errors and exit non-zero
}

const result = await provisionTemple(parsed.data, actor);
```

### Architecture Compliance

- AD-1: The CLI performs cross-tenant provisioning as a super-admin action. Tenant-admin roles must not satisfy actor attribution.
- AD-2: CLI provisioning must call `lib/provisioning/temples.ts`; it must not sequence repository writes directly.
- AD-4: New production provisioning commands must not call `getPilotTenant()`.
- AD-5 and AD-7: Do not add public signup, billing, approval queue, tenant switching, tenant deletion, tenant transfer, impersonation, data export, Meta embedded signup, webhook auto-registration, template approval, or tenant-owned WhatsApp self-serve controls.
- AD-6: Audit logging remains inside `provisionTemple()`. The CLI must provide a real super-admin actor and must not write a second audit record.
- AD-9: Keep payload names canonical: `tenant`, `domain`, `firstMember`, `roles`, and `whatsappAccount`.
- AD-11: Optional WhatsApp linkage is provisioning-time only and non-transferable through the service.
- AD-18: V0 role codes are fixed: `admin`, `priest`, `committee_member`, `volunteer`, and `devotee`.
- AD-19: The service stores full normalized hostnames like `svtemple.trytempleos.com`; the CLI should accept `--subdomain`, not a free-form stored hostname override.

### File Structure Requirements

- NEW: `scripts/provision-temple.mts`
- NEW or UPDATE: `scripts/provision-temple.test.ts` or a focused script test file near existing script tests.
- UPDATE: `package.json` to add `"provision:temple": "tsx scripts/provision-temple.mts"`.
- UPDATE: `scripts/seed-bootstrap.test.ts` only if extending the existing script guardrail is cleaner than adding a new test.
- Do not modify `lib/provisioning/temples.ts` unless CLI tests expose a real reusable contract gap.
- Do not modify `app/api/super-admin/temples/route.ts` or `features/super-admin/new-temple-form*`; those are already separate callers of the same service.
- Do not add `GET /api/super-admin/temples` or temple list/detail pages; Epic 3 owns those.

### Testing Requirements

- Follow the repo's current Vitest style.
- Prefer testing pure argument/env parsing helpers exported from `scripts/provision-temple.mts` so the CLI behavior is testable without spawning a child process.
- Mock `@/lib/provisioning/temples` and `@/lib/db/pool` in script tests.
- Static guardrails should use `node:fs` and source scanning, consistent with `scripts/seed-bootstrap.test.ts` and `app/api/super-admin/auth-boundary.test.ts`.
- Tests must not require live Postgres, Firebase, Meta, Railway, browser automation, or a running dev server.
- Keep broader provisioning transaction, authorization isolation, and old-footgun regression coverage in Story 2.6; Story 2.5 only needs focused CLI behavior plus static guardrails for this script.

### Previous Story Intelligence

- Story 2.1 established the canonical validation contract. Reuse `parseProvisionTempleInput()` instead of revalidating provisioning rules manually in the script.
- Story 2.2 implemented `provisionTemple()` with one checked-out transaction client, rollback on failure, stable conflict mapping, existing-person reuse, non-reassigning WhatsApp linkage, and audit logging.
- Story 2.3 implemented the API route and patched error handling to avoid leaking validation input, raw service errors, stack details, and internal constraint names. Apply the same leak discipline to CLI output.
- Story 2.4 implemented the UI caller and helper mapping. Do not import client UI helpers into the CLI; they are for browser form state, while the CLI should map flags/env into the canonical raw service input.
- Recent static guardrails intentionally prevent new provisioning paths from using `admin_users`, `getPilotTenant()`, tenant dashboard auth helpers, direct repository provisioning sequences, or unsafe WhatsApp upsert behavior.

### Git Intelligence

- Recent commits:
  - `dbc9389 Implement super admin new temple form`
  - `a018a63 Implement super admin temple provisioning API`
  - `b6de425 Implement temple provisioning transaction`
  - `1fa72ae Implement canonical temple provisioning contract`
  - `294d9f8 tests`
- Baseline at story creation: `dbc9389`.
- Worktree was clean at story creation.

### Latest Technical Information

- This story does not require a new external API or library. Use the repo-locked stack from `package.json`: Next.js `16.2.10`, React `19.2.4`, TypeScript, `pg` `^8.22.0`, Zod `^4.4.3`, `tsx` `^4.23.1`, and Vitest `^4.1.10`.
- Existing Story 2.x docs already captured the relevant official guidance for this implementation: `node-postgres` transactions must use one checked-out client, Zod `safeParse()` returns a discriminated validation result, and Vitest module mocks are the repo-compatible way to isolate service dependencies.
- No new dependency is justified for CLI parsing. A small local parser matching `scripts/seed-super-admin.mts` is sufficient unless the user explicitly approves adding a CLI library.

### Non-Goals

- Do not build another provisioning service.
- Do not implement Super Admin temple list, detail, update, role-governance, or tenant member-management routes.
- Do not add public signup, billing, approval queue, tenant switching, tenant deletion, tenant transfer, impersonation, data export, Meta embedded signup, webhook auto-registration, template approval, tenant-owned WhatsApp self-serve setup, or WhatsApp transfer/disconnect.
- Do not revive `admin_users`.
- Do not use `getPilotTenant()` for production provisioning.
- Do not broaden Story 2.5 into the full Story 2.6 guardrail suite.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.5-Provision-Temple-CLI]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2-Super-Admin-Temple-Provisioning]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-2---Provisioning-has-one-canonical-mutation-path]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-4---Pilot-only-lookup-must-not-provision-production-tenants]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-6---Privileged-writes-must-use-one-audit-log]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-9---Provisioning-DTOs-are-canonical-service-contracts]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-19---Tenant-domain-stores-full-normalized-hostnames]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-2---Canonical-Provisioning]
- [Source: _bmad-output/implementation-artifacts/2-1-define-canonical-provisioning-contract.md#Dev-Notes]
- [Source: _bmad-output/implementation-artifacts/2-2-provision-temple-transaction.md#Completion-Notes-List]
- [Source: _bmad-output/implementation-artifacts/2-3-super-admin-provision-temple-api.md#Dev-Notes]
- [Source: _bmad-output/implementation-artifacts/2-4-super-admin-new-temple-form.md#Dev-Notes]
- [Source: lib/provisioning/temples.ts]
- [Source: lib/provisioning/temples.test.ts]
- [Source: scripts/load-env.mts]
- [Source: scripts/seed-super-admin.mts]
- [Source: scripts/seed-bootstrap.test.ts]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- scripts/provision-temple.test.ts` - RED failed because `scripts/provision-temple.mts` did not exist.
- `npm run test -- scripts/provision-temple.test.ts` - passed, 1 file / 8 tests.
- `npm run test -- lib/provisioning/temples.test.ts scripts/seed-bootstrap.test.ts` - passed, 2 files / 21 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run test` - passed, 40 files / 270 tests.
- `git diff --check` - passed.
- Code review - 0 decision-needed, 5 patch, 0 defer, 1 dismissed; all patches applied.
- `npm run test -- scripts/provision-temple.test.ts` - passed after review patches, 1 file / 13 tests.
- `npm run test -- lib/provisioning/temples.test.ts scripts/seed-bootstrap.test.ts` - passed after review patches, 2 files / 21 tests.
- `npm run typecheck` - passed after review patches.
- `npm run lint` - passed after review patches.
- `npm run test` - passed after review patches, 40 files / 275 tests.
- `git diff --check` - passed after review patches.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented `scripts/provision-temple.mts` as the production `provision:temple` CLI over the canonical `parseProvisionTempleInput()` and `provisionTemple()` service path.
- Added CLI flag/env mapping for tenant, subdomain, first member, roles, optional WhatsApp linkage, and explicit super-admin actor attribution.
- Added safe validation, conflict, failure, and success output without raw input, Meta IDs, stack traces, SQL constraint names, or direct repository writes.
- Added focused script tests and static guardrails proving canonical service reuse, sanitized output, partial WhatsApp rejection, actor handling, and no pilot/admin provisioning footguns.
- Applied code review patches for explicit blank flag precedence, unknown flag rejection, actor usage output, guarded pool cleanup, and service-failure leak coverage.

### File List

- `_bmad-output/implementation-artifacts/2-5-provision-temple-cli.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `package.json`
- `scripts/provision-temple.mts`
- `scripts/provision-temple.test.ts`

## Change Log

- 2026-07-19: Created Story 2.5 context file and marked ready for dev.
- 2026-07-19: Implemented Story 2.5 provisioning CLI and moved story to review.
- 2026-07-19: Applied code review patches and moved Story 2.5 to done.
