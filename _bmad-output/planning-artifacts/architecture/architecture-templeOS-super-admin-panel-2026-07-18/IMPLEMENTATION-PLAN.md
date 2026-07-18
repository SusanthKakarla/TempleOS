# TempleOS Super Admin Panel Implementation Plan

## Goal

Move TempleOS from pilot-only provisioning to operator-controlled multi-temple provisioning without weakening tenant isolation.

## Phase 1 - Data And Auth Spine

1. Add `platform_operators`.
   - Fields: `id`, `phone_number`, `display_name`, `firebase_uid`, `active`, timestamps.
   - Keep this separate from `admin_users`.
   - V0 has no platform-operator role hierarchy.

2. Add operator session helpers.
   - Reuse Firebase phone OTP verification.
   - Add `requirePlatformOperator()`.
   - Use a cookie name different from `templeos_session`.
   - Session payload: `{ operatorId, phoneNumber, displayName, exp }`.
   - Do not let tenant-local `super_admin` pass operator checks.

3. Add first-operator bootstrap.
   - Add `npm run seed:operator` or equivalent.
   - Seed against `platform_operators`, not `admin_users`.

4. Add tenant repository functions.
   - `createTenant(input)`.
   - `listTenants()`.
   - `getTenantById(id)`.
   - `updateTenant(id, fields)`.
   - Name operator-only broad reads clearly, for example `listTenantsForOperator`.

## Phase 2 - Canonical Provisioning

1. Add `lib/provisioning/temples.ts`.
   - `provisionTemple({ tenant, firstAdmin, whatsappAccount? }, actor)`.
   - `updateProvisionedTemple({ tenantId, tenant }, actor)`.
   - `linkTempleWhatsAppAccount({ tenantId, whatsappAccount }, actor)`.
   - Wrap tenant, first admin, optional WhatsApp mapping, and audit/log boundary in one transaction.
   - Normalize phone numbers before repository writes.
   - Force the first admin role to `super_admin`.

2. Replace pilot-only commands.
   - Add `npm run provision:temple`.
   - Require tenant details and first admin details.
   - Accept optional WhatsApp details.
   - Stop using `getPilotTenant()` for production setup.

3. Keep old seed path only for local/demo bootstrap or retire it.

4. Make WhatsApp linking non-transferable in V0.
   - Reject a `metaPhoneNumberId` already linked to another tenant.
   - Enforce at most one active WhatsApp account per tenant.
   - Defer transfer/disconnect flows.

## Phase 3 - Operator UI/API

1. Add `/operator`.
   - List tenants.
   - Show basic temple status: tenant details, first admin, WhatsApp connected/unlinked.

2. Add `/operator/temples/new`.
   - Temple name, phone, address, timezone.
   - First admin phone/name.
   - Optional WhatsApp phone, Meta phone number ID, business account ID.

3. Add APIs under `/api/operator`.
   - `GET /api/operator/temples`.
   - `POST /api/operator/temples`.
   - `GET/PATCH /api/operator/temples/:tenantId`.
   - Optional `PUT /api/operator/temples/:tenantId/whatsapp`.

## Phase 4 - Guardrails And Tests

1. Tests for provisioning transaction.
   - Creates tenant + first admin.
   - Optional WhatsApp mapping links to the new tenant.
   - Duplicate admin phone returns conflict.
   - Duplicate Meta phone number ID returns conflict or updates intentionally.

2. Tests for authorization.
   - Tenant `super_admin` cannot call operator APIs.
   - Platform operator can provision.
   - Tenant APIs still derive `tenantId` from session.

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
