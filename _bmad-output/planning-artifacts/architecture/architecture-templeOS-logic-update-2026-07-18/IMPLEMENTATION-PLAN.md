# TempleOS Logic Update Implementation Plan

This plan updates application logic to match the clean-reset multi-tenant model: super-admins are platform-wide, tenant-admins are tenant-scoped role assignments, people are global, and access is resolved by `x.trytempleos.com`.

## Phase 0 - Reset Schema Contract

Goal: make the database shape match the new logic before refactoring runtime code.

- Decide the reset mechanic before coding against the new schema:
  - replace the legacy migration set with forward-schema migrations, or
  - add an explicit reset command that drops/recreates the DB before applying the forward schema.
- Ensure the normal setup path cannot silently apply legacy `admin_users` migrations after the reset decision.
- Replace old pilot migrations with a forward reset schema that includes `super_admins`, `persons`, `tenant_domains`, `role_definitions`, `tenant_memberships`, `tenant_membership_roles`, `audit_log`, and updated tenant-owned tables.
- Remove `admin_users` from the reset schema.
- Change actor columns:
  - `events.created_by` -> `events.created_by_membership_id`.
  - `donations.recorded_by` -> `donations.recorded_by_membership_id`.
- Keep tenant-owned data tables scoped by `tenant_id`.
- Seed fixed V0 role definitions: `admin`, `priest`, `committee_member`, `volunteer`, `devotee`.

Acceptance checks:

- No reset migration creates `admin_users`.
- `npm run migrate` or the chosen reset command produces the forward schema, not the pilot schema.
- `role_definitions` seeds the fixed V0 role codes.
- Tenant-owned authored fields reference `tenant_memberships`.

Runtime requirement:

- Pin Node `>=22` in repo/deploy configuration before relying on Firebase Admin 14.2.0 and Next 16.2.10 in Railway.

## Phase 1 - Types and Repositories

Goal: give the rest of the app correct primitives.

- Update `types/db.ts`:
  - Remove `AdminUser` and `AdminRole`.
  - Add `SuperAdmin`, `Person`, `TenantDomain`, `RoleDefinition`, `TenantMembership`, `TenantMembershipRole`, and `AuditLogEntry`.
  - Replace `createdBy` / `recordedBy` types with membership-based actor fields.
- Add repository modules:
  - `lib/db/super-admins.ts`
  - `lib/db/persons.ts`
  - `lib/db/tenant-domains.ts`
  - `lib/db/role-definitions.ts`
  - `lib/db/tenant-memberships.ts`
  - `lib/db/audit-log.ts`
- Update `lib/db/tenants.ts` with `createTenant`, `listTenantsForSuperAdmin`, and production-safe lookup functions.
- Keep repository scope explicit: tenant-owned functions take `tenantId`; global functions are named as global lookup helpers.
- Implement the canonical identity contract:
  - `persons.phone_number` is normalized E.164 and globally unique.
  - `tenant_memberships` is unique on `(tenant_id, person_id)`.
  - Membership access state is `status = 'active' | 'inactive'`.
  - Tenant display name lives on the membership.
  - `tenant_membership_roles` references `role_definitions.id`.
  - `role_definitions.capability_set` is a JSON array of capability strings.

Acceptance checks:

- `rg "AdminUser|AdminRole|admin_users"` only finds retired files or no matches after cutover.
- Repository tests cover person reuse by phone, tenant membership uniqueness, multi-role assignment, and cross-tenant distinction for the same person.

## Phase 2 - Session Split and Host Resolution

Goal: stop using one `adminId` session for everything.

- Replace `lib/auth/session.ts` with:
  - `lib/auth/session-token.ts` for shared signing/verification if useful.
  - `lib/auth/tenant-session.ts` for tenant cookie and tenant session payload.
  - `lib/auth/super-admin-session.ts` for super-admin cookie and super-admin session payload.
  - `lib/auth/tenant-resolution.ts` for request host normalization and `tenant_domains` lookup.
  - `lib/auth/capabilities.ts` for role-to-capability checks.
- Update `app/api/auth/session/route.ts`:
  - Resolve host to tenant.
  - Verify Firebase ID token.
  - Normalize phone.
  - Find existing person.
  - Require active tenant membership.
  - Load roles/capabilities.
  - Create tenant session.
- Add `app/api/super-admin/auth/session/route.ts`:
  - Verify Firebase ID token.
  - Require active `super_admins` row.
  - Create super-admin session.
- Make tenant capability guards re-read active membership, role assignments, and role-definition capability state instead of trusting only role codes baked into the cookie.
- Make tenant capability guards re-resolve the current request host and require it to match `session.tenantId`.
- Configure tenant cookies as host-only in production. Do not use a wildcard `.trytempleos.com` tenant session cookie.

Acceptance checks:

- Tenant login from `x.trytempleos.com` fails if the host is unknown.
- Tenant login fails if the person has no active membership in that tenant.
- The same phone can log into Temple A with Temple A roles and Temple B with Temple B roles.
- A tenant session cannot access super-admin APIs.
- A super-admin session cannot be mistaken for tenant dashboard context.
- Removing a tenant member's `admin` role blocks `members.manage` on the next guarded request without waiting for cookie expiry.
- A valid Tenant A cookie on `b.trytempleos.com` is rejected.
- An unauthorized phone login does not create an unaffiliated `persons` row.

## Phase 3 - Tenant Route Refactor

Goal: preserve existing tenant scoping while replacing admin assumptions.

- Replace all `getSessionAdmin()` imports in tenant pages and APIs with tenant-session helpers.
- Replace `session.adminId` with `session.membershipId` where the user is the actor.
- Add capability checks at mutation boundaries:
  - `dashboard.access` for dashboard entry.
  - `members.manage` for member/role management.
  - Existing content routes can initially require `dashboard.access` unless a stricter V0 capability is defined.
- Keep every tenant repository call scoped by `session.tenantId`.
- Use the capability seed contract:
  - `admin`: `["dashboard.access", "members.manage"]`
  - `priest`: `[]`
  - `committee_member`: `[]`
  - `volunteer`: `[]`
  - `devotee`: `[]`

Acceptance checks:

- `rg "getSessionAdmin|session.adminId|requireSuperAdmin" app lib` returns no tenant-dashboard usage.
- All tenant API mutations return `401` without tenant session and `403` without required capability.
- Tenant A session cannot read or mutate Tenant B data by request body or URL.

## Phase 4 - Authored Records and Audit

Goal: make actor references correct for multi-temple people.

- Update event creation to store `created_by_membership_id`.
- Update donation creation to store `recorded_by_membership_id`.
- Decide naming in TypeScript as `createdByMembershipId` and `recordedByMembershipId`.
- Add `audit_log` writes for:
  - super-admin tenant provisioning
  - role definition changes
  - tenant member creation/reactivation
  - tenant member role assignment/removal
  - WhatsApp account linkage
- Privileged writes should perform audit insert in the same transaction.
- Use audit actor types:
  - `super_admin`
  - `tenant_membership`
  - `system`
  - `provider`
- Keep `actor_id` nullable only for `system` and `provider`.
- Keep `tenant_id` nullable only for global platform actions such as role catalog changes.

Acceptance checks:

- Creating an event as the same person in two temples stores different membership IDs.
- Role assignment rollback happens if the audit insert fails.
- Audit entries include `actor_type`, `actor_id`, `tenant_id`, `action`, `target_type`, `target_id`, and metadata.

## Phase 5 - Tenant Member and Role Management

Goal: replace admin provisioning with tenant-local member provisioning.

- Replace `app/api/admins/*` with tenant-local member routes:
  - `GET /api/members`
  - `POST /api/members`
  - `PATCH /api/members/[membershipId]`
  - `PUT /api/members/[membershipId]/roles`
- Replace the dashboard Admins page with a Members/Roles page.
- Tenant-admin workflow:
  - Enter phone and display name.
  - Create/reuse global person.
  - Create/reactivate tenant membership.
  - Assign one or more allowed roles.
- Implement tenant member mutations through a shared membership service used by both tenant routes and super-admin provisioning.
- Preserve the distinction between person, devotee profile, membership, and role assignment in UI labels.

Acceptance checks:

- A priest can also have the `admin` role through the same membership.
- Tenant-admin can assign roles only inside their tenant.
- Tenant-admin cannot assign roles not allowed by platform role definitions.
- Member role changes create audit entries.
- Tenant-admin member creation and super-admin first-member provisioning use the same duplicate/reactivation semantics.

## Phase 6 - Super-Admin Control Plane

Goal: add platform-level provisioning paths without leaking into tenant dashboard logic.

- Add super-admin session route and route guard.
- Add super-admin routes for:
  - tenant list/detail
  - provision temple
  - add first tenant member/admin
  - link WhatsApp account
  - manage global role definitions if needed in V0
- Implement `lib/provisioning/temples.ts` as the canonical transaction used by both UI and CLI.
- Reuse the shared membership service inside `provisionTemple` for first-member creation and role assignment.
- Keep tenant IDs explicit only in super-admin APIs.

Acceptance checks:

- Super-admin can provision two temples with two different subdomains and first admins.
- Provisioning rejects duplicate `tenant_domains.hostname`.
- Provisioning rejects WhatsApp `meta_phone_number_id` already linked to another tenant.
- The super-admin route cannot be accessed with a tenant session.

## Phase 7 - Provisioning Scripts

Goal: remove pilot-only seed behavior.

- Replace:
  - `scripts/seed-admin.mts`
  - `scripts/seed-whatsapp-account.mts`
  - production use of `scripts/seed.mts`
- Add:
  - `scripts/seed-super-admin.mts`
  - `scripts/provision-temple.mts`
  - optional `scripts/seed-demo.mts` for local demo data only.
- Add package scripts:
  - `seed:super-admin`
  - `provision:temple`
  - optionally `seed:demo`

Acceptance checks:

- `rg "getPilotTenant" scripts lib app` finds no production provisioning path.
- Provisioning CLI requires or creates an explicit tenant.
- Running the CLI twice for different temples creates distinct tenants, domains, memberships, and WhatsApp links.

## Phase 8 - WhatsApp and Devotee Linking

Goal: keep webhook tenant-safe while adding person linkage where appropriate.

- Keep webhook tenant resolution by `whatsapp_accounts.meta_phone_number_id`.
- Keep devotee rows tenant-scoped.
- Add optional person linking:
  - if incoming WhatsApp phone matches an existing `persons.phone_number`, attach `devotees.person_id`.
  - do not create tenant membership from WhatsApp interaction alone.
- Keep WhatsApp/person backfill tenant-local: member creation or login may link that tenant's matching devotee row, but must not backfill devotees across other tenants as a side effect.
- Ensure WhatsApp-created devotee profiles do not grant dashboard access.

Acceptance checks:

- Same phone can be a devotee in Temple A and a tenant member in Temple B without role leakage.
- WhatsApp webhook for one `meta_phone_number_id` writes only to that tenant.
- A WhatsApp-only devotee cannot log into dashboard until membership and roles are assigned.

## Phase 9 - Test and Cutover

Goal: prove the new model works before relying on it.

- Unit tests:
  - token signing/verification for both session types
  - host normalization and tenant domain resolution
  - person upsert/reuse
  - membership role assignment
  - capability resolver
  - audit transactional behavior
- Route tests or focused integration tests:
  - tenant login success/failure
  - super-admin login success/failure
  - member role management
  - cross-tenant access denial
- Manual checks:
  - provision Temple A at `a.trytempleos.com`
  - provision Temple B at `b.trytempleos.com`
  - use same person phone with different roles in each tenant
  - confirm each tenant dashboard sees only its own devotees/events/donations

Recommended verification commands:

```bash
npm run typecheck
npm run lint
npm test
```

## Breakage Forecast

Yes, current logic will break if only the schema is changed. The main breakpoints are intentional and should be handled in this order:

| Breakpoint | Why it breaks | Plan coverage |
| --- | --- | --- |
| Login | `app/api/auth/session/route.ts` reads `admin_users`. | Phase 2 |
| Dashboard layout | `app/(dashboard)/layout.tsx` expects `session.adminId` and `getAdminById`. | Phase 3 |
| Admin management | `app/api/admins/*` and dashboard Admins page depend on `admin_users`. | Phase 5 |
| Event creation | Writes `createdBy: session.adminId`. | Phase 4 |
| Donation creation | Writes `recordedBy: session.adminId`. | Phase 4 |
| Seed scripts | Use `getPilotTenant()`. | Phase 7 |
| Types | `types/db.ts` still exposes `AdminUser`, `AdminRole`, and admin actor fields. | Phase 1 |

The safe implementation order is schema -> repositories/types -> session split -> tenant route refactor -> authored/audit changes -> member management -> super-admin provisioning -> script replacement -> tests.
