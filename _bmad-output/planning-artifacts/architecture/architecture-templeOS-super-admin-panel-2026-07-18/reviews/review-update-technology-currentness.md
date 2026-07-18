# Update Review - Technology Currentness / Reality Check

Verdict: **CONDITIONAL PASS**

The updated spine is materially better than the prior currentness review: it now explicitly states that the operator route tree, provisioning service, platform operator store, persons, memberships, roles, tenant domains, and audit repository are planned structure rather than current checkout reality. The implementation plan also correctly sequences those as future phases.

The remaining issue is consistency. Some earlier sections still use target-state language without an immediate "planned" qualifier, and the source list mixes existing code files with planned tables in a way that can still mislead a builder skimming the spine. The document is usable as an architecture target, but it should not be read as a map of what already exists in the checkout.

## Findings

### 1. Opening architecture prose still reads as target-state current reality before the planned-structure caveat appears

Severity: Medium

`ARCHITECTURE-SPINE.md:39-67` diagrams `app/(operator)`, `app/api/operator`, `lib/provisioning`, `tenant_domains`, and subdomain login as the architecture flow. The first explicit caveat that these files and tables are not present does not appear until `ARCHITECTURE-SPINE.md:246-249`.

Current checkout reality is different:

- `lib/auth/session.ts:6-14` defines only the tenant dashboard session shape, using `templeos_session` with `adminId`, `tenantId`, `phoneNumber`, `displayName`, and `exp`.
- `app/api/auth/session/route.ts:32-53` logs in by `findActiveAdminByPhone()` and creates an admin-user tenant session, with no subdomain/hostname lookup.
- Repository/code search finds no `app/(operator)`, `app/api/operator`, `lib/provisioning`, `tenant-domains`, `persons`, `tenant-memberships`, or `platform-operators` implementation.

Impact: The spine now distinguishes planned structure, but the distinction arrives late. A builder reading top-down can still treat the diagram and paragraph as current substrate. Add a short "Current checkout baseline vs target additions" block before the Design Paradigm diagram, or label the diagram as "target architecture."

### 2. Person, membership, role, and subdomain rules are accurately planned, but not yet tied to the current transitional model

Severity: Medium

AD-12, AD-13, AD-14, and AD-15 correctly describe the planned person/membership/roles/subdomain architecture. They also fix the conceptual model: global `person`, tenant-scoped `tenant_memberships`, tenant-scoped role assignments, and login resolved through `tenant_domains`.

The current checkout still uses the transitional `admin_users` model:

- `migrations/001_initial_schema.sql:16-26` creates `admin_users` with tenant-scoped admin identity and globally unique `phone_number`.
- `migrations/003_admin_roles.sql:1-12` widens that table only to `super_admin` / `admin`, not the planned role catalog.
- `types/db.ts:23-35` exposes only `AdminRole = "super_admin" | "admin"` and `AdminUser`; there are no `Person`, `TenantMembership`, or `RoleDefinition` types.
- `lib/db/admin-users.ts:31-37` resolves active dashboard users by phone from `admin_users`, not `persons`.

Impact: The planned model is sound, but the spine should explicitly call `admin_users` a transitional current implementation and state the migration bridge: current tenant `super_admin` maps to future membership role `admin`; current `admin` maps to future membership role `admin` only if that is intentional, or to a narrower role if not. Without that mapping, implementation can preserve the wrong permission semantics while still following the document's role-code language.

### 3. Provisioning currentness is mostly corrected, but the source list still implies more implementation than exists

Severity: Low

The implementation plan is clear that canonical provisioning is future work: `IMPLEMENTATION-PLAN.md:51-73` says to add `lib/provisioning/temples.ts`, add `provision:temple`, stop using `getPilotTenant()` for production setup, and keep/retire old seed paths only for local/demo bootstrap.

The spine's frontmatter sources, however, list current files (`migrations/001_initial_schema.sql`, `migrations/002_seed_pilot_tenant.sql`, `lib/db/tenants.ts`, `scripts/seed*.mts`) next to a scope that includes tenant creation, first admin/member creation, roles, domains, and WhatsApp linkage. Current implementation remains split:

- `lib/db/tenants.ts:44-50` has `getPilotTenant()` as the canonical MVP tenant lookup.
- `lib/db/tenants.ts:52-142` exposes get/update only, not `createTenant()`.
- `scripts/seed-admin.mts:52-79` updates the pilot tenant and upserts an admin through `admin_users`.
- `scripts/seed-whatsapp-account.mts:44-55` separately links WhatsApp to the pilot tenant.
- `package.json:12-15` exposes only `migrate`, `seed`, `seed:admin`, and `seed:whatsapp`, not `seed:operator` or `provision:temple`.

Impact: This is no longer a blocker because AD-4 and the implementation plan describe the target migration. Still, the spine would be more reality-proof if the `sources` list separated "current checkout evidence" from "planned additions in this spine."

### 4. Tenant and WhatsApp scoping claims remain well-grounded in current code

Severity: Informational

The spine's tenant isolation and WhatsApp tenant-resolution statements are accurate for the current implemented MVP paths:

- `app/api/whatsapp/webhook/route.ts:138-148` resolves the Meta `phone_number_id`, loads the WhatsApp account, and handles messages with `account.tenantId`.
- `migrations/001_initial_schema.sql:29-40` makes `whatsapp_accounts.meta_phone_number_id` unique and tenant-owned.
- `migrations/001_initial_schema.sql:42-101` keeps events, devotees, WhatsApp messages, and interactions tenant-scoped.

Impact: Preserve these rules. They are the strongest checkout-backed part of the spine and should be used as the continuity anchor while adding operator/person/membership/subdomain architecture.

## Resolved Since Prior Review

- The spine now explicitly marks the Structural Seed as planned, not present in the checkout (`ARCHITECTURE-SPINE.md:246-249`).
- Stack versions now match the current `package.json` / lockfile stance closely enough for this review lens: exact pins for Next.js and React, lockfile-resolved language for TypeScript, and current direct dependency versions for `pg`, Firebase, Firebase Admin, Zod, and Vitest (`ARCHITECTURE-SPINE.md:230-244`, `package.json:17-51`).
- AD-8 resolves the prior ambiguity around operator auth by specifying Firebase phone OTP, `platform_operators.phone_number`, no V0 operator role hierarchy, a first-operator bootstrap, and a session payload distinct from `templeos_session` (`ARCHITECTURE-SPINE.md:113-118`).

## Bottom Line

The update passes the BMAD currentness/reality-check gate as a target architecture document. It still needs a stronger front-loaded baseline statement so implementers cannot confuse the planned person/membership/roles/subdomain architecture with the current pilot-only `admin_users` + `getPilotTenant()` checkout.
