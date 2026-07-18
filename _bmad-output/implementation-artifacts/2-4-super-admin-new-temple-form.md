---
baseline_commit: a018a63a27afd59201970493438bdccec833cf6a
created_at: 2026-07-19T00:18:56+0530
story_generation_note: "Created from bmad-create-story for the first backlog Epic 2 story."
---

# Story 2.4: Super Admin New Temple Form

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a super admin,
I want a form to enter temple, subdomain, first member, roles, and optional WhatsApp details,
so that I can provision a pilot temple without writing SQL.

## Acceptance Criteria

1. Given a super admin opens `/super-admin/temples/new`, when the page loads, then the form includes temple name, subdomain slug, generated full hostname, contact phone, address, timezone, first member phone, first member display name, first member roles defaulting to `admin`, and optional WhatsApp phone, Meta phone number ID, and Meta business account ID.
2. Given the super admin edits the subdomain slug, when the value changes, then the UI displays the normalized full hostname preview and reserved names such as `www`, `admin`, `super-admin`, and `api` are blocked before submission.
3. Given the form is submitted with valid data, when the API returns success, then the UI shows the created temple summary and exposes the created subdomain and first admin/member details.
4. Given the API returns validation or conflict errors, when the form handles the response, then field-level or section-level errors are shown and the super admin does not lose entered non-secret form values.
5. Given the Super Admin provisioning UI is in scope, when the page is implemented, then it does not expose public signup, approval queue, billing, tenant deletion, tenant transfer, impersonation, data export, or Meta embedded signup affordances.

## Tasks / Subtasks

- [x] Add the Super Admin new-temple route and page shell. (AC: 1, 5)
  - [x] Create `app/(super-admin)/super-admin/temples/new/page.tsx`.
  - [x] Render a server page that imports a focused client form component instead of putting stateful form logic in the page.
  - [x] Keep the page under the super-admin route group only; do not add tenant dashboard navigation, public signup, billing, approval queues, tenant deletion, tenant transfer, impersonation, data export, or Meta embedded signup controls.
  - [x] Provide a concise operator-focused heading and context, but do not build a marketing or onboarding landing page.

- [x] Build the provisioning form component and local form helpers. (AC: 1, 2)
  - [x] Create `features/super-admin/new-temple-form.tsx` as a `"use client"` component.
  - [x] Create `features/super-admin/new-temple-form-helpers.ts` for pure helper logic that can be unit tested without a browser DOM.
  - [x] Include controlled fields for temple name, tenant slug, subdomain slug, contact phone, address, timezone, first member phone, first member display name, role checkboxes, and optional WhatsApp phone, Meta phone number ID, and Meta business account ID.
  - [x] Default `firstMember.roles` to `["admin"]`; prevent the `admin` role from being removed because provisioning requires the first member to be an admin.
  - [x] Offer the remaining V0 role codes as optional additional role checkboxes: `priest`, `committee_member`, `volunteer`, and `devotee`.
  - [x] Default timezone to a stable IANA value appropriate for the current pilot path, such as `America/Los_Angeles`, while allowing the user to edit it.
  - [x] Keep all controlled input state initialized to strings or arrays, never `undefined` or `null`, to avoid uncontrolled-to-controlled React warnings.

- [x] Implement client-side normalization and pre-submit blocking for subdomain values. (AC: 2)
  - [x] Normalize the visible subdomain slug to lowercase by trimming whitespace and converting invalid separators to hyphens only where safe.
  - [x] Display the full hostname preview as `<normalized-subdomain>.trytempleos.com` using the same product domain as `lib/provisioning/temples.ts`.
  - [x] Block reserved subdomain submissions for at least `www`, `admin`, `super-admin`, and `api`; prefer reusing an exported constant from `lib/provisioning/temples.ts` if it can be imported into client code without pulling server-only dependencies, otherwise duplicate the tiny reserved-name list in the helper with a comment that the API remains authoritative.
  - [x] If the subdomain is invalid or reserved, show a field-level error before calling `fetch()`.
  - [x] Do not treat the client preview as persistence truth; the API parser remains the source of canonical normalization.

- [x] Submit the canonical provisioning payload to the existing API. (AC: 3, 4)
  - [x] POST to `/api/super-admin/temples` with JSON shape `{ tenant, domain, firstMember, whatsappAccount? }`.
  - [x] Map form state to `tenant.name`, `tenant.slug`, `tenant.defaultContactPhone`, `tenant.address`, `tenant.timezone`, `domain.subdomain`, `firstMember.phoneNumber`, `firstMember.displayName`, `firstMember.roles`, and optional `whatsappAccount`.
  - [x] Omit `whatsappAccount` entirely when all optional WhatsApp fields are blank.
  - [x] Require all three WhatsApp fields together before including `whatsappAccount`; show a section-level error if the user fills only part of that optional section.
  - [x] On success, render the returned `temple` summary from the API response without guessing IDs or hostnames locally.
  - [x] Keep non-secret form values in state after validation or conflict errors so the user can correct and resubmit.

- [x] Handle API errors with field-level and section-level feedback. (AC: 4)
  - [x] Handle `400` responses with `code: "VALIDATION_ERROR"` and `errors: [{ path, message }]` by mapping known paths such as `tenant.slug`, `domain.subdomain`, `tenant.defaultContactPhone`, `firstMember.phoneNumber`, `firstMember.roles`, and `whatsappAccount.*` to field errors.
  - [x] Handle `409` responses with `code: "PROVISIONING_CONFLICT"` and optional `field` by showing the conflict near the matching field or section.
  - [x] Handle `401` by showing that a Super Admin session is required.
  - [x] Handle `403` by showing that tenant-admin access is not enough for this page.
  - [x] Handle unknown or malformed error bodies with one generic section-level failure message.
  - [x] Do not render raw phone numbers, Meta IDs, stack traces, SQL constraint names, or raw request bodies in error text.

- [x] Add focused tests for helper logic and page/source guardrails. (AC: 1, 2, 3, 4, 5)
  - [x] Add `features/super-admin/new-temple-form-helpers.test.ts`.
  - [x] Test subdomain normalization, hostname preview, reserved-name blocking, optional WhatsApp omission, partial WhatsApp section validation, default admin role preservation, and API payload mapping.
  - [x] Add or extend a static route/source test for `app/(super-admin)` that rejects public signup, approval queue, billing, tenant deletion, tenant transfer, impersonation, data export, Meta embedded signup, `getPilotTenant`, `admin_users`, tenant dashboard auth helper imports, and direct repository provisioning sequences.
  - [x] Do not add React Testing Library, jsdom, Playwright, or other new dependencies for this story unless the user explicitly approves them.

- [x] Verify the story. (AC: 1, 2, 3, 4, 5)
  - [x] Run `npm run test -- features/super-admin/new-temple-form-helpers.test.ts`.
  - [x] Run the relevant static guardrail test for the Super Admin UI source.
  - [x] Run `npm run test -- app/api/super-admin/temples/route.test.ts app/api/super-admin/auth-boundary.test.ts`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint`.

### Review Findings

- [x] [Review][Patch] Super Admin page has no server-side auth gate [`app/(super-admin)/super-admin/temples/new/page.tsx:3`]
- [x] [Review][Patch] Visible subdomain value is not normalized as edited [`features/super-admin/new-temple-form.tsx:157`]
- [x] [Review][Patch] Network failure path has no visible error state [`features/super-admin/new-temple-form.tsx:61`]
- [x] [Review][Patch] Tenant slug is silently rewritten before submission [`features/super-admin/new-temple-form-helpers.ts:139`]
- [x] [Review][Patch] API validation or conflict errors can become invisible for empty or unmapped paths [`features/super-admin/new-temple-form-helpers.ts:177`]

## Dev Notes

### Controlling Context

- Use `_bmad-output/planning-artifacts/epics.md` as the controlling story source for Story 2.4.
- Use `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md` and `IMPLEMENTATION-PLAN.md` as the governing architecture.
- The older `_bmad-output/planning-artifacts/templeos-mvp-prd.md` is stale where it excludes Super Admin. Story 2.4 follows the July 18 Super Admin architecture and Epic 2.
- No `project-context.md` file is present in this checkout.

### Current State To Build On

- `app/api/super-admin/temples/route.ts` already implements `POST /api/super-admin/temples`.
- The route calls `requireSuperAdmin()`, parses JSON, validates with `parseProvisionTempleInput(raw)`, calls `provisionTemple(parsed.data, actor)`, and returns `201` with `{ temple }`.
- The route returns stable errors the UI must consume:
  - `400` `{ error: "Invalid provisioning request", code: "VALIDATION_ERROR", errors: [{ path, message }] }`
  - `401` `{ error: "Super Admin session required", code: "UNAUTHENTICATED" }`
  - `403` `{ error: "Super Admin access required", code: "FORBIDDEN" }`
  - `409` `{ error: "Temple provisioning conflicts with an existing record.", code: "PROVISIONING_CONFLICT", field?: string }`
  - `500` `{ error: "Temple provisioning failed.", code: "PROVISIONING_FAILED" }`
- `lib/provisioning/temples.ts` exports `PRODUCT_DOMAIN`, `RESERVED_TENANT_SUBDOMAINS`, `parseProvisionTempleInput()`, and `provisionTemple()`. Be careful importing it into a client component because the same module also imports DB/server dependencies. Prefer importing constants/helpers only into server/test code unless bundling is verified safe.
- `types/db.ts` defines V0 role codes as `admin`, `priest`, `committee_member`, `volunteer`, and `devotee`.
- There is no `app/(super-admin)` route tree yet. This story creates the first Super Admin UI route.
- Existing interactive forms live under `features/*` and use local React state, `fetch()`, `Button`, `Input`, `Label`, `Textarea`, `Select`, `Card`, and `sonner` where needed.

### Required UI Contract

The form should submit this canonical API body:

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
    roles: Array<"admin" | "priest" | "committee_member" | "volunteer" | "devotee">;
  };
  whatsappAccount?: {
    phoneNumber: string;
    metaPhoneNumberId: string;
    metaBusinessAccountId: string;
  };
}
```

On success, render the API response:

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

### Architecture Compliance

- AD-1: This page is for platform super admins only. Tenant-admin role membership must not be presented as enough access.
- AD-2: The UI must call `POST /api/super-admin/temples`; it must not sequence repository writes or call `provisionTemple()` directly from client code.
- AD-3: Cross-tenant provisioning input is accepted only through a super-admin-authorized API route.
- AD-4: New production provisioning paths must not call `getPilotTenant()`.
- AD-5 and AD-7: Do not include public signup, billing, approval queue, tenant switching, tenant deletion, tenant transfer, impersonation, data export, Meta embedded signup, webhook auto-registration, template approval, or tenant-owned WhatsApp self-serve connection UI.
- AD-9: Keep payload names canonical: `tenant`, `domain`, `firstMember`, `roles`, and `whatsappAccount`.
- AD-11: WhatsApp linkage remains optional provisioning-time setup only; do not build transfer/disconnect controls.
- AD-19: The UI preview uses full normalized hostnames like `svtemple.trytempleos.com`; the API remains authoritative for stored domain normalization.

### File Structure Requirements

- NEW: `app/(super-admin)/super-admin/temples/new/page.tsx`
- NEW: `features/super-admin/new-temple-form.tsx`
- NEW: `features/super-admin/new-temple-form-helpers.ts`
- NEW: `features/super-admin/new-temple-form-helpers.test.ts`
- NEW or UPDATE: a static guardrail test covering `app/(super-admin)` source. Use a location consistent with the current tests, such as `app/api/super-admin/auth-boundary.test.ts` if broadening the existing boundary check is clean, or a new focused test file if clearer.
- Do not modify `app/api/super-admin/temples/route.ts` unless a UI story test exposes a real API contract bug.
- Do not add `GET /api/super-admin/temples`; Story 3.1 owns list behavior.
- Do not add `scripts/provision-temple.mts`; Story 2.5 owns CLI provisioning.

### Testing Requirements

- Follow the repo's current Vitest pattern. There is no current React Testing Library setup in this checkout.
- Test pure form helpers for payload mapping and client-side validation instead of adding a browser test dependency.
- Static guardrails should read source files with `node:fs`, like `app/api/super-admin/auth-boundary.test.ts`.
- API regression tests should continue to use the existing route tests from Story 2.3.
- Tests must not require live Postgres, Firebase, Meta, Railway, browser automation, or a running dev server.

### Previous Story Intelligence

- Story 2.3 implemented the API route this UI must call and applied review patches to avoid leaking validation input, raw service errors, stack details, and internal constraint names.
- Story 2.3's route contract is stable enough for UI mapping: field paths come from `parseProvisionTempleInput()`, and conflicts may include `field`.
- Story 2.2 implemented the transactional `provisionTemple()` service with rollback, duplicate hostname/Meta phone conflict mapping, person reuse by phone, and audit logging.
- Story 2.1 established the canonical DTO. Do not invent a UI-only payload shape that bypasses or renames `tenant`, `domain`, `firstMember`, or `whatsappAccount`.
- Recent review guardrails intentionally prevent new provisioning paths from using `admin_users`, `getPilotTenant()`, tenant dashboard auth helpers, or direct multi-table writes.

### Git Intelligence

- Recent commits:
  - `a018a63 Implement super admin temple provisioning API`
  - `b6de425 Implement temple provisioning transaction`
  - `1fa72ae Implement canonical temple provisioning contract`
  - `294d9f8 tests`
  - `5e593d8 Enforce tenant admin dashboard access`
- Baseline at story creation: `a018a63a27afd59201970493438bdccec833cf6a`.
- Worktree was clean at story creation.

### Latest Technical Information

- Official Next.js Server and Client Component docs say App Router pages are Server Components by default, and Client Components are appropriate for state, event handlers, and browser APIs. Use a server `page.tsx` plus a `"use client"` form component for this story. [Source: https://nextjs.org/docs/app/getting-started/server-and-client-components]
- Official Next.js forms guidance covers form validation, validation errors, and pending states. This story uses the existing API route rather than introducing Server Actions because Story 2.3 already established `POST /api/super-admin/temples` as the contract. [Source: https://nextjs.org/docs/app/guides/forms]
- Official React input/select/textarea docs require controlled fields to have synchronous `onChange` handlers and stable string/array values; initialize blank fields as `""` and role selections as arrays. [Source: https://react.dev/reference/react-dom/components/input] [Source: https://react.dev/reference/react-dom/components/select] [Source: https://react.dev/reference/react-dom/components/textarea]
- Official Vitest docs support `vi.stubGlobal()` for globals such as `fetch`, but this story should prefer pure helper tests and existing route tests to avoid adding DOM test dependencies. [Source: https://main.vitest.dev/guide/mocking/globals]

### Non-Goals

- Do not build Super Admin temple list or detail pages; Epic 3 owns those operations.
- Do not add tenant update, tenant deletion, tenant transfer, impersonation, data export, billing, approval queue, public signup, tenant switching, Meta embedded signup, webhook auto-registration, template approval, or tenant-owned WhatsApp self-serve setup.
- Do not add CLI provisioning; Story 2.5 owns `provision:temple`.
- Do not add guardrail tests for all provisioning transactionality; Story 2.6 owns the broader guardrail suite.
- Do not revive `admin_users`.
- Do not use `getPilotTenant()` in this UI or helper path.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.4-Super-Admin-New-Temple-Form]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2-Super-Admin-Temple-Provisioning]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-Design-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-2---Provisioning-has-one-canonical-mutation-path]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-5---Super-Admin-panel-is-not-self-serve-onboarding]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-9---Provisioning-DTOs-are-canonical-service-contracts]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md#AD-19---Tenant-domain-stores-full-normalized-hostnames]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md#Phase-4---Super-Admin-UIAPI]
- [Source: _bmad-output/implementation-artifacts/2-3-super-admin-provision-temple-api.md#Dev-Notes]
- [Source: app/api/super-admin/temples/route.ts]
- [Source: lib/provisioning/temples.ts]
- [Source: types/db.ts]
- [Source: features/chatbot-settings/temple-info-form.tsx]
- [Source: app/api/super-admin/auth-boundary.test.ts]
- [Source: https://nextjs.org/docs/app/getting-started/server-and-client-components]
- [Source: https://nextjs.org/docs/app/guides/forms]
- [Source: https://react.dev/reference/react-dom/components/input]
- [Source: https://react.dev/reference/react-dom/components/select]
- [Source: https://react.dev/reference/react-dom/components/textarea]
- [Source: https://main.vitest.dev/guide/mocking/globals]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test -- features/super-admin/new-temple-form-helpers.test.ts` - RED failed on missing `features/super-admin/new-temple-form-helpers.ts`.
- `npm run test -- app/api/super-admin/auth-boundary.test.ts` - RED failed because no Super Admin UI sources existed yet.
- `npm run test -- features/super-admin/new-temple-form-helpers.test.ts` - passed, 1 file / 6 tests.
- `npm run test -- app/api/super-admin/auth-boundary.test.ts` - passed, 1 file / 3 tests.
- `npm run test -- app/api/super-admin/temples/route.test.ts app/api/super-admin/auth-boundary.test.ts` - passed, 2 files / 14 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run test` - passed, 39 files / 260 tests.
- `git diff --check` - passed.
- Code review - 0 decision-needed, 5 patch, 0 defer, 0 dismissed; all patches applied.
- `npm run test -- features/super-admin/new-temple-form-helpers.test.ts` - passed after review patches, 1 file / 7 tests.
- `npm run test -- app/api/super-admin/auth-boundary.test.ts` - passed after review patches, 1 file / 4 tests.
- `npm run test -- app/api/super-admin/temples/route.test.ts app/api/super-admin/auth-boundary.test.ts` - passed after review patches, 2 files / 15 tests.
- `npm run test` - passed after review patches, 39 files / 262 tests.
- `npm run typecheck` - passed after review patches.
- `npm run lint` - passed after review patches.
- `git diff --check` - passed after review patches.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context created from live sprint status, Epic 2 requirements, the July 18 Super Admin architecture, Story 2.3 API contract, provisioning service source, current UI form patterns, and current test setup.
- Implemented `/super-admin/temples/new` as a server page that renders a focused client form for canonical temple provisioning.
- Added pure form helpers for subdomain normalization, hostname preview, reserved-name blocking, role preservation, optional WhatsApp validation, payload mapping, and API error mapping.
- Added the client form with controlled fields, default admin role, optional additional role checkboxes, optional WhatsApp section, API submission, field/section error handling, and success summary rendering from the API response.
- Extended Super Admin static guardrails to scan `.tsx` UI sources and prevent deferred controls, legacy auth/data footguns, and direct repository provisioning sequences.
- Applied code review patches for server-side Super Admin page gating, visible slug normalization, network failure messaging, full reserved-name client blocking, tenant slug pre-submit validation, and fallback display for empty or unmapped API errors.

### File List

- `_bmad-output/implementation-artifacts/2-4-super-admin-new-temple-form.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/(super-admin)/super-admin/temples/new/page.tsx`
- `app/(super-admin)/super-admin/require-super-admin.ts`
- `app/api/super-admin/auth-boundary.test.ts`
- `features/super-admin/new-temple-form.tsx`
- `features/super-admin/new-temple-form-helpers.ts`
- `features/super-admin/new-temple-form-helpers.test.ts`

## Change Log

- 2026-07-19: Created Story 2.4 context file and marked ready for dev.
- 2026-07-19: Implemented Story 2.4 Super Admin new temple form and moved story to review.
- 2026-07-19: Applied code review patches and moved Story 2.4 to done.
