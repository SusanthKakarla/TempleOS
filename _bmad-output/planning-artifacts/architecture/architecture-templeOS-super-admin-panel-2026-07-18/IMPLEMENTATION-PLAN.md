# TempleOS Super Admin Panel Implementation Plan

## Goal

Move TempleOS from pilot-only provisioning to super-admin-controlled multi-temple provisioning without weakening tenant isolation, while introducing a person + tenant membership + roles model that supports one human having different roles in different temples.

## Phase 1 - Data And Auth Spine

1. Add `super_admins`.
   - Fields: `id`, `phone_number`, `display_name`, `firebase_uid`, `active`, timestamps.
   - Keep this separate from tenant memberships.
   - V0 has no super-admin role hierarchy.

2. Add super-admin session helpers.
   - Reuse Firebase phone OTP verification.
   - Add `requireSuperAdmin()`.
   - Use a cookie name different from tenant sessions.
   - Session payload: `{ superAdminId, phoneNumber, displayName, exp }`.
   - Do not let tenant-admin roles pass super-admin checks.

3. Add first-super-admin bootstrap.
   - Add `npm run seed:super-admin` or equivalent.
   - Seed against `super_admins`, not tenant memberships.

4. Add global person identity.
   - Add `persons`.
   - Key by normalized phone number.
   - Keep Firebase UID on the person or login identity record.
   - Do not store temple-specific permissions on `persons`.

5. Add tenant domain resolution.
   - Add `tenant_domains`.
   - Store subdomains such as `svtemple.trytempleos.com`.
   - Resolve hostname before completing tenant login.
   - Defer custom domains and generic tenant picker.

6. Add role and membership tables.
   - Add `role_definitions`.
   - Seed global role codes: `admin`, `priest`, `committee_member`, `volunteer`, `devotee`.
   - Seed V0 capabilities exactly:
     - `admin`: dashboard access plus tenant member/role management.
     - `priest`: identity marker only for V0.
     - `committee_member`: identity marker only for V0.
     - `volunteer`: identity marker only for V0.
     - `devotee`: tenant relationship marker, not dashboard access by itself.
   - Add `tenant_memberships`.
   - Add `tenant_membership_roles`.

7. Add tenant repository functions.
   - `createTenant(input)`.
   - `listTenants()`.
   - `getTenantById(id)`.
   - `updateTenant(id, fields)`.
   - Name super-admin-only broad reads clearly, for example `listTenantsForSuperAdmin`.

## Phase 2 - Canonical Provisioning

1. Add `lib/provisioning/temples.ts`.
   - `provisionTemple({ tenant, domain, firstMember, whatsappAccount? }, actor)`.
   - `updateProvisionedTemple({ tenantId, tenant }, actor)`.
   - `assignTenantMemberRoles({ tenantId, personId, roles }, actor)`.
   - `linkTempleWhatsAppAccount({ tenantId, whatsappAccount }, actor)`.
   - Wrap tenant, subdomain, first member, first member role assignments, optional WhatsApp mapping, and audit/log boundary in one transaction.
   - Normalize phone numbers before repository writes.
   - Require first member roles to include `admin`.

2. Replace pilot-only commands.
   - Add `npm run provision:temple`.
   - Require tenant details, subdomain, first member details, and first member roles.
   - Accept optional WhatsApp details.
   - Stop using `getPilotTenant()` for production setup.

3. Retire the old pilot seed path for production setup.

4. Make WhatsApp linking non-transferable in V0.
   - Reject a `metaPhoneNumberId` already linked to another tenant.
   - Enforce at most one active WhatsApp account per tenant.
   - Defer transfer/disconnect flows.

## Phase 3 - Clean-Start Identity Rules

1. Create new tables directly from the forward schema.
   - No `admin_users` compatibility table.
   - No migration/backfill from old pilot data.
   - New author references point at `tenant_memberships` or `persons`.

2. Link devotees opportunistically.
   - Do not create persons for every WhatsApp-only devotee in V0.
   - Set `devotees.person_id` only when the normalized devotee phone matches an existing person.
   - Keep devotee opt-in and profile fields tenant-scoped.

3. Use membership as tenant login source of truth from day one.
   - Session stores `tenantId`, `personId`, `membershipId`, `roles`, and `exp`.

## Phase 4 - Super Admin UI/API

1. Add `/super-admin`.
   - List tenants.
   - Show basic temple status: tenant details, subdomain, admins/members, WhatsApp connected/unlinked.

2. Add `/super-admin/temples/new`.
   - Temple name, subdomain slug, generated full hostname, phone, address, timezone.
   - First member phone/name.
   - First member roles, defaulting to `admin`.
   - Optional WhatsApp phone, Meta phone number ID, business account ID.

3. Add APIs under `/api/super-admin`.
   - `GET /api/super-admin/temples`.
   - `POST /api/super-admin/temples`.
   - `GET/PATCH /api/super-admin/temples/:tenantId`.
   - `GET/POST /api/super-admin/roles`.
   - `PUT /api/super-admin/temples/:tenantId/members/:membershipId/roles`.
   - Optional `PUT /api/super-admin/temples/:tenantId/whatsapp`.

4. Add subdomain validation.
   - Store full normalized hostnames like `svtemple.trytempleos.com`.
   - Reject reserved names such as `www`, `admin`, `super-admin`, `api`, and apex product domains.
   - Strip scheme, path, query, and port before matching.
   - Use a local-only tenant host override for development.

## Phase 5 - Tenant Member Role Management

1. Replace tenant-local admin management with member management.
   - Tenant admins can add members by phone number.
   - Tenant admins can assign allowed roles inside their own tenant.
   - A member can hold multiple roles in one tenant.
   - The same person can hold different roles in different tenants.

2. Update login/session creation.
   - Resolve `tenant_domains.hostname` from the subdomain.
   - Firebase phone OTP resolves `person`.
   - Session creation requires an active `tenant_membership` for that person and tenant.
   - Session stores `tenantId`, `personId`, `membershipId`, and role codes.

## Phase 6 - Guardrails And Tests

1. Tests for provisioning transaction.
   - Creates tenant + subdomain + first person + first membership + roles.
   - Optional WhatsApp mapping links to the new tenant.
   - Duplicate person phone reuses the person but creates only one membership per tenant.
   - Duplicate Meta phone number ID returns conflict or updates intentionally.

2. Tests for authorization.
   - Tenant-admin cannot call super-admin APIs.
   - Super-admin can provision.
   - Tenant APIs still derive `tenantId` from session.
   - Temple A admin role does not authorize Temple B actions.
   - A person can be `admin` and `priest` in Temple A but only `devotee` in Temple B.
   - Login from `subdomain-a.trytempleos.com` cannot produce a Temple B session.
   - Apex/generic hosts cannot create tenant sessions.
   - Local host override cannot run in production.
   - WhatsApp-only devotees do not automatically become login-capable members.

3. Tests for old footgun.
   - New provisioning paths do not call `getPilotTenant()`.

## Explicit Non-Goals For This Slice

- No billing.
- No public signup.
- No tenant approval workflow.
- No tenant deletion.
- No tenant impersonation.
- No Meta embedded signup.
- No tenant-owned WhatsApp self-serve connection UI.
