# Currentness / Brownfield Reality Review

Verdict: **CONDITIONAL PASS**

The logic-update spine is current enough to use as a target architecture. Its strongest section is `Current Checkout Breakpoints`: those bullets accurately describe the active `admin_users` session model, tenant-scoped API pattern, event/donation author fields, and pilot seeding shape.

The gate should remain conditional because several committed decisions depend on a clean-reset / forward-schema cutover that does not exist in the current checkout, and one login rule creates a direct identity-state ambiguity. The document should either make those cutover assumptions explicit or add the missing implementation substrate before a builder treats the spine as executable.

## Findings

### 1. The clean-reset / forward-schema decision is not backed by the current migration runner

Severity: High

The spine inherits the parent decision that a clean DB reset starts from the forward schema and that `admin_users` is not an auth source (`ARCHITECTURE-SPINE.md:54`). The refactor map also says `lib/db/admin-users.ts` is retired after reset, `events.created_by` becomes `events.created_by_membership_id`, and `donations.recorded_by` becomes `donations.recorded_by_membership_id` (`ARCHITECTURE-SPINE.md:249-253`).

The current checkout does not contain that reset mechanism. `scripts/migrate.mts:27-55` creates `schema_migrations`, sorts `.sql` files, skips already-applied migrations, and applies only pending migration files. Current committed migrations create and keep the legacy shape:

- `migrations/001_initial_schema.sql:16-27` creates `admin_users`.
- `migrations/001_initial_schema.sql:42-56` creates `events.created_by` as a foreign key to `admin_users`.
- `migrations/004_donations.sql:3-17` creates `donations.recorded_by` as a foreign key to `admin_users`.
- There are no committed migrations or schema files for `super_admins`, `persons`, `tenant_domains`, `role_definitions`, `tenant_memberships`, `tenant_membership_roles`, or `audit_log`.

Impact: A builder following `npm run migrate` cannot reach the architecture's asserted forward schema. The spine needs an explicit brownfield cutover contract: either "drop/recreate DB out of band, then apply replacement migrations" or "add a new migration path that creates/backfills/repoints/drops the legacy auth tables." Without that, AD-16 is a product decision but not current checkout reality.

### 2. Tenant login creates `persons` before proving tenant membership, which can leave unauthorized global identities

Severity: High

AD-3 says tenant login is `Firebase ID token -> normalized phone -> create/reuse persons row -> require active tenant_memberships row` (`ARCHITECTURE-SPINE.md:121-125`). That is not just target-state implementation detail; it commits to mutation order in the auth exchange.

The current checkout does not behave this way. `app/api/auth/session/route.ts:18-41` verifies Firebase, then rejects non-allowlisted phone numbers before creating or updating session state. `lib/db/admin-users.ts:31-37` only reads active `admin_users` by phone. The only auth-related write on successful login is `setAdminFirebaseUid()` after an existing admin row is found (`app/api/auth/session/route.ts:44-45`).

This also conflicts with the inherited identity rule that a `person` may exist without tenant membership only if they are a super-admin or explicitly provisioned for future membership. With the AD-3 ordering, any Firebase-verified but unauthorized phone number attempting login on a tenant host can create a global `persons` row and then fail membership authorization.

Impact: The spine needs to choose one policy: create/reuse `persons` only after a matching active membership or super-admin state exists, or explicitly allow failed tenant-login attempts to create unaffiliated `persons` rows and document why that is acceptable. Current checkout evidence supports the former.

### 3. The structural seed is target-state, but this spine does not label it as planned-only

Severity: Medium

The spine's `Current Checkout Breakpoints` section is clear that the app currently uses the pilot model (`ARCHITECTURE-SPINE.md:59-69`). Immediately after that, the design paradigm, structural seed, and sequence diagram describe `tenant_domains`, `persons`, `tenant_memberships`, `role_definitions`, split session modules, member routes, and provisioning services (`ARCHITECTURE-SPINE.md:73-105`, `ARCHITECTURE-SPINE.md:187-240`).

Repository evidence shows these are not present:

- `lib/auth/session.ts:6-15` has one `templeos_session` with `adminId`, `tenantId`, `phoneNumber`, `displayName`, and `exp`.
- `app/api/auth/session/route.ts:32-53` logs in through `admin_users` and sets that single session.
- `lib/db/tenants.ts:44-50` still documents `getPilotTenant()` as the canonical MVP lookup.
- `package.json:12-15` exposes only `migrate`, `seed`, `seed:admin`, and `seed:whatsapp`; it has no `seed-super-admin`, `provision-temple`, or `seed-demo` script.

Impact: The target model is acceptable, but the section should say "planned target structure, not present in checkout yet." The parent architecture has that style of caveat; this spine should repeat it because this is the artifact a builder will read first.

### 4. Runtime version constraints are not captured even though current packages require them

Severity: Medium

The inherited stack versions match the current package and lockfile versions closely enough: for example, `package.json:23-29` lists Firebase, Firebase Admin, Next, and `pg`, and `package-lock.json:7592-7608` resolves `firebase-admin` to `14.2.0`.

The missing currentness constraint is Node. `firebase-admin@14.2.0` declares `node >=22` in the lockfile (`package-lock.json:7606-7608`). Next `16.2.10` also requires a modern runtime (`package-lock.json:10298-10317` shows `node >=20.9.0`). The app targets Railway hosting, but `package.json:1-53` has no `engines.node`, and there is no `.nvmrc`, `.node-version`, `Dockerfile`, `railway.json`, or `nixpacks.toml` in the checkout.

Impact: Any architecture decision relying on Firebase Admin server verification plus Railway deployment should state the Node runtime floor or add it to repo config. Otherwise a valid implementation of the spine can fail in deployment without violating any architecture rule.

### 5. Capability-based authorization is directionally sound but needs an exact migration mapping from current roles

Severity: Medium

AD-5 and AD-13 require capability checks from active membership, membership roles, and role definitions (`ARCHITECTURE-SPINE.md:133-137`, `ARCHITECTURE-SPINE.md:181-185`). That is a better target than scattered role strings.

The current code has only the legacy two-role `admin_users` model. `migrations/003_admin_roles.sql:1-12` promotes the old `tenant_admin` rows to `super_admin`, then constrains roles to `super_admin` and `admin`. `lib/auth/session.ts:87-95` treats `admin_users.role = 'super_admin'` as the live privileged check. `lib/db/admin-users.ts:89-94` counts tenant-local super admins, not platform-wide super admins.

Impact: The spine inherits fixed V0 role seeds from the parent, but this document should still state the exact migration mapping from current rows to future identities: which existing `admin_users.role` values become `super_admins`, which become tenant memberships, and which role codes/capabilities each receives. Without that, two implementers can both follow the spine while preserving different effective access.

## Non-Findings

- The package versions named by the inherited architecture are current against `package.json` and the lockfile. I did not find a version mismatch for Next.js, React, TypeScript, `pg`, Firebase, Firebase Admin, Zod, or Vitest.
- Including donations in this logic update is checkout-backed even though older MVP docs excluded donations. The current repo has donation routes, tables, types, and repositories, so reviewing authored donation records here is current brownfield reality.
- Tenant-scoped repository calls are accurately described. Existing dashboard and API paths consistently pass `session.tenantId` server-side rather than trusting client-supplied tenant IDs.

## Gate Resolution Needed

Before implementation, resolve these items in the spine or companion implementation plan:

1. State the exact DB reset or migration cutover path.
2. Decide whether failed tenant logins are allowed to create `persons`.
3. Label structural seed and sequence diagrams as planned target state.
4. Pin or document the Node runtime floor for Railway.
5. Add the exact legacy `admin_users` to `super_admins` / `tenant_memberships` / `role_definitions` mapping.
