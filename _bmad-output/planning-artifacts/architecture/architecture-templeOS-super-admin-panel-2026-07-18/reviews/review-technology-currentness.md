# Technology Currentness / Reality-Check Review

Verdict: **CONDITIONAL PASS**

The spine is directionally current for the existing TempleOS stack and for the accepted MVP deployment/provider choices. The main risk is not stale external technology, but that several architecture elements are written as if the checkout already has an operator control plane, durable operator identity store, and canonical provisioning transaction. In the current codebase, those are proposed additions, not existing substrate.

## Findings

### 1. Operator control-plane components are planned, not present in the checkout

Severity: High

The spine names `app/(operator)`, `app/api/operator`, `lib/auth/operator-session.ts`, `lib/db/platform-operators.ts`, `lib/db/operator-audit-log.ts`, `lib/provisioning/temples.ts`, and `scripts/provision-temple.mts` as the structural seed. Current checkout search over `app`, `lib`, and `scripts` finds no operator/provisioning paths. The existing auth surface is tenant-admin session auth in `lib/auth/session.ts`, with cookie name `templeos_session` and session payload fields `adminId`, `tenantId`, `phoneNumber`, and `displayName`.

Evidence:

- `lib/auth/session.ts:6-14` defines the current tenant session cookie and payload.
- `lib/auth/session.ts:87-94` authorizes only tenant-local `super_admin`.
- `app/api/admins/route.ts:7-21` and `app/api/admins/[id]/route.ts:10-14` gate admin APIs with `requireSuperAdmin()`.
- `find app lib scripts -path '*operator*' -o -path '*provision*'` returned no files.

Reality-check impact: AD-1 is the right boundary, but implementation cannot reuse an existing platform-operator identity store or operator session helper. Those must be built from scratch or the spine should label them explicitly as new components.

### 2. "One canonical mutation path" does not match current provisioning reality

Severity: High

AD-2 says a single server-side provisioning service owns tenant creation, first admin creation, and optional WhatsApp linkage, and both UI and CLI commands must call it. The checkout currently has separate repository/script paths: `getPilotTenant()` returns the oldest tenant, `seed-admin` updates that tenant and upserts an admin, and `seed-whatsapp` links WhatsApp separately. `lib/db/tenants.ts` has `getTenantById()` and `updateTenant()`, but no `createTenant()` repository function. There is no `lib/provisioning/temples.ts`.

Evidence:

- `lib/db/tenants.ts:26-31` documents and implements pilot-tenant lookup via oldest tenant.
- `lib/db/tenants.ts:34-63` exposes get/update only, not tenant creation.
- `scripts/seed-admin.mts:52-79` looks up the pilot tenant, optionally updates it, then calls `upsertAdminUser()`.
- `lib/db/admin-users.ts:52-68` has a CLI-oriented admin upsert.
- `lib/db/whatsapp-accounts.ts:54-71` independently upserts WhatsApp account linkage.

Reality-check impact: AD-2 and AD-4 are correct as target-state rules, but they represent a migration away from current bootstrap behavior. The implementation plan should include creating the canonical service and retiring or wrapping the existing seed scripts.

### 3. Operator auditability is specified, but there is no durable audit schema yet

Severity: Medium

AD-6 allows structured server logs until a durable audit table exists, and that is realistic. However, the ER diagram and structural seed include `operator_audit_log` / `lib/db/operator-audit-log.ts` as if the table and repository are part of the architecture substrate. Current migrations define `tenants`, `admin_users`, `whatsapp_accounts`, `events`, `devotees`, `whatsapp_messages`, and `whatsapp_interactions`; there is no platform operator or audit table.

Evidence:

- `migrations/001_initial_schema.sql:6-101` defines the current tables and indexes.
- `migrations/003_admin_roles.sql:1-11` only widens tenant admin roles to `super_admin` and `admin`.
- No `platform_operators` or `operator_audit_log` files/tables are present in the checkout.

Reality-check impact: The "until durable audit table exists" clause is important and should drive V0 implementation. Do not treat the ER diagram as current schema.

### 4. Stack versions are current against the lockfile, but the spine mixes exact pins and range dependencies

Severity: Low

The named stack versions match the current resolved lockfile for the technologies listed in the spine: Next.js `16.2.10`, React `19.2.4`, TypeScript `5.9.3`, `pg` `8.22.0`, Firebase `12.16.0`, Firebase Admin `14.2.0`, Zod `4.4.3`, and Vitest `4.1.10`. The nuance is that `package.json` uses caret ranges for several dependencies and dev dependencies, while the exact versions are lockfile-resolved. The spine's "TypeScript pinned by project package-lock" is accurate, and the same caveat applies to `pg`, Firebase, Zod, and Vitest.

Evidence:

- `package.json:22-36` lists direct runtime dependencies, many as caret ranges.
- `package.json:38-50` lists dev dependencies, including TypeScript `^5` and Vitest `^4.1.10`.
- `package-lock.json` currently resolves: Next.js `16.2.10`, React `19.2.4`, TypeScript `5.9.3`, `pg` `8.22.0`, Firebase `12.16.0`, Firebase Admin `14.2.0`, Zod `4.4.3`, Vitest `4.1.10`.

Reality-check impact: No version-currentness blocker from the checkout. If the spine is meant to be exact, say "lockfile-resolved" for all caret-based entries.

### 5. Tenant and WhatsApp scoping claims match the implemented MVP paths

Severity: Informational

The strongest currentness match is AD-3. Tenant dashboard APIs derive tenant scope from the session, and WhatsApp webhook processing resolves tenant scope from Meta `phone_number_id` through the WhatsApp account repository.

Evidence:

- `app/api/admins/route.ts:13` lists admins using `admin.tenantId`.
- `app/api/admins/route.ts:37-41` creates admins inside `admin.tenantId`.
- `app/api/admins/[id]/route.ts:25-28` verifies the target admin belongs to the current admin's tenant.
- `app/api/whatsapp/webhook/route.ts:116-126` reads `metadata.phone_number_id`, loads the account, and calls the handler with `account.tenantId`.
- `lib/db/whatsapp-accounts.ts:30-37` resolves accounts by `meta_phone_number_id`.

Reality-check impact: This part of the spine is well-grounded in the checkout and should be preserved.
