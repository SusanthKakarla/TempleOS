# Divergence Adversary Review - Architecture Spine

Reviewed artifact: `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md`

Lens: construct two downstream builders who follow every AD, then look for places where their independently valid work would not compose.

## Verdict

Needs revision before implementation handoff.

The spine has the right directional decisions, but it does not yet define enough shared contracts for independently staffed implementation. Two builders can follow every AD and still produce incompatible operator APIs, provisioning semantics, role/session boundaries, audit records, and WhatsApp linkage behavior.

## Downstream Builders

### Builder A - Operator Control Plane Builder

Builder A owns:

- `app/(operator)/operator/**`
- `app/api/operator/**`
- `lib/auth/operator-session.ts`
- `lib/db/platform-operators.ts`
- `lib/db/operator-audit-log.ts`

Builder A follows the ADs by:

- keeping operators outside `admin_users`;
- giving operator routes a separate session helper and cookie;
- accepting explicit `tenantId` only under operator-authorized APIs;
- logging operator mutations with actor, target tenant, action, timestamp, and metadata;
- exposing create/list/view/update tenant screens, plus a manual WhatsApp linkage route.

Likely implementation choices:

- `POST /api/operator/temples` accepts `{ templeName, contactPhone, address, timezone, firstAdmin, whatsapp }`;
- `PATCH /api/operator/temples/[tenantId]` updates basic tenant profile fields directly through `lib/db/tenants.ts`;
- `PUT /api/operator/temples/[tenantId]/whatsapp` upserts a WhatsApp account for a tenant;
- operator session payload is `{ operatorId, phoneNumber, displayName, exp }`;
- audit actions are strings like `temple.created`, `temple.updated`, `whatsapp.linked`, with metadata storing route-level request bodies.

### Builder B - Provisioning / Tenant Domain Builder

Builder B owns:

- `lib/provisioning/temples.ts`
- `scripts/provision-temple.mts`
- `lib/db/tenants.ts`
- `lib/db/admin-users.ts`
- `lib/db/whatsapp-accounts.ts`
- tenant-local admin and WhatsApp repository contracts

Builder B follows the ADs by:

- making `provisionTemple(input, actor)` the only full tenant + first admin + optional WhatsApp creation path;
- keeping tenant-local `super_admin` inside `admin_users`;
- deriving tenant identity from tenant sessions and webhook phone number IDs outside operator routes;
- requiring production CLI provisioning to target or create a tenant through the canonical service;
- preserving `getPilotTenant()` for local demo bootstrap only.

Likely implementation choices:

- `provisionTemple` accepts `{ tenant: { name, defaultContactPhone, address, timezone }, firstAdmin: { phoneNumber, displayName }, whatsappAccount?: {...} }`;
- it always creates the first admin as role `super_admin`;
- it returns `{ tenant, firstAdmin, whatsappAccount }`;
- WhatsApp linking is treated as part of provisioning and uses `ON CONFLICT (meta_phone_number_id)`;
- audit is a callback or optional repository call from inside the transaction, not route-level logging.

## Findings

### 1. Provisioning ownership is underspecified after initial creation.

AD-2 says one canonical mutation path owns the transaction that creates a tenant, first `super_admin`, and optional WhatsApp account. AD-5 also says the operator panel supports create/list/view/update and manual WhatsApp account linkage. Those are both valid, but the spine does not say whether post-create tenant updates and post-create WhatsApp linking must also go through `lib/provisioning/temples.ts`, or whether operator routes may call `lib/db/tenants.ts` and `lib/db/whatsapp-accounts.ts` directly.

Builder A can comply by treating `provisionTemple` as create-only and using repositories for `PATCH /api/operator/temples/[tenantId]` and `/whatsapp`. Builder B can comply by making `provisionTemple` own every operator mutation boundary to preserve audit and transaction consistency. The result is incompatible ownership: duplicate validation, inconsistent audit placement, different error semantics, and a likely bypass of the canonical service for manual WhatsApp linkage.

Required spine tightening:

- Define whether the provisioning service owns only initial provisioning or all operator mutations that cross tenant/admin/WhatsApp boundaries.
- Name the exact service functions for update and linkage, for example `updateProvisionedTemple` and `linkTempleWhatsAppAccount`, or explicitly allow repository-only route handlers for those cases.
- State where audit is emitted for each operator mutation: route handler, service layer, repository, or a single audit wrapper.

### 2. Shared request and return shapes are not canonical.

The spine names `provisionTemple` and routes, but it does not define payload fields, normalized data shape, required fields, or return contracts. Two builders can both follow the ADs and still disagree on `tenant` vs `temple`, `defaultContactPhone` vs `contactPhone`, `whatsapp` vs `whatsappAccount`, whether first admin role is caller-supplied or forced, and whether phone normalization happens in validation, repository code, or the provisioning service.

This is already a live divergence risk because the existing database/types use `Tenant.defaultContactPhone`, `AdminUser.role`, and `WhatsAppAccount.metaPhoneNumberId`, while the operator UI is allowed to use user-facing temple language. Without a canonical DTO, Builder A may send UI-shaped data and Builder B may implement domain-shaped input. Both would be defensible from the spine and incompatible at runtime.

Required spine tightening:

- Add canonical TypeScript contracts for `ProvisionTempleInput`, `ProvisionTempleResult`, `LinkWhatsAppAccountInput`, `UpdateTenantInput`, and the operator list/detail summary shape.
- State where phone normalization happens and whether downstream layers may assume normalized input.
- State that first admin role is always `super_admin` during provisioning, unless a future AD changes it.
- Define whether API response objects use domain names (`tenant`) or UI names (`temple`).

### 3. Operator identity store and auth boundary are directionally named but not buildable.

AD-1 requires an operator identity store outside `admin_users` and distinct operator sessions. The structural seed names `platform_operators`, but the spine never defines its minimum schema, bootstrap path, login method, role model, session payload, or whether Firebase phone OTP is shared with tenant admins. The diagram points both Operator API and Tenant API at Firebase, but the AD only says separate helper modules and cookies.

Builder A can build a `platform_operators` table with phone-number OTP login and cookie payload `{ operatorId, phoneNumber }`. Builder B can assume operator identity is an environment-backed allowlist or manually seeded DB table and only consume `{ actorOperatorId }` in provisioning. Both obey AD-1, but they will not agree on how CLI provisioning supplies an actor, how audit validates the actor, or how operator APIs distinguish `401` unauthenticated from `403` unauthorized.

Required spine tightening:

- Define the operator identity source for this slice: table schema, env allowlist, seed script, or external provider.
- Define operator session payload and cookie name.
- Define operator bootstrap flow for the first operator.
- Define whether all operators are equal for V0 or whether operator roles exist.
- Define `401` vs `403`; the current error convention only mentions `403` for unauthorized operator access.

### 4. Tenant scoping rule does not cover repository safety or operator read breadth.

AD-3 correctly says tenant dashboard APIs derive `tenant_id` from session and operator APIs may accept explicit tenant IDs. It does not say whether shared repositories must enforce tenant scoping in signatures, nor does it define the allowed breadth of operator reads. Builder A can implement `listTemples` with cross-tenant aggregates and tenant detail pages that include admins and WhatsApp status. Builder B can implement repositories that only expose tenant-scoped functions and intentionally avoid cross-tenant aggregation outside `tenants.ts`.

Both follow AD-3, but integration diverges: the operator UI expects cross-tenant summaries that the domain repositories do not expose, while repository helpers such as `getAdminById(adminId)` and `getWhatsAppAccountByPhoneNumberId(metaPhoneNumberId)` remain globally keyed and can be reused incorrectly in operator or tenant-local contexts.

Required spine tightening:

- Define repository boundary rules: which functions may be globally keyed, which must include `tenantId`, and which are operator-only.
- Define operator list/detail data shapes and which related objects are allowed on each view.
- Define whether operator APIs may read tenant admins and WhatsApp details, or only tenant metadata plus stable counts/status.
- Require route-level tenant authorization wrappers for every operator route that accepts `[tenantId]`, even if operators are globally privileged today.

### 5. WhatsApp account reassignment semantics are ambiguous.

AD-3 says webhooks derive tenant identity from `whatsapp_accounts.meta_phone_number_id`; AD-5 says manual WhatsApp linkage is in scope; AD-2 says optional WhatsApp setup can happen inside provisioning. None of those rules define whether a Meta phone number can be moved between tenants, whether a tenant can have exactly one WhatsApp account forever, or whether relinking should disconnect the previous account.

Builder A can implement manual linkage as an idempotent upsert by `meta_phone_number_id`, allowing an operator to point an existing Meta number at a different tenant. Builder B can read the ERD's `tenants ||--o| whatsapp_accounts` as one account per tenant and reject reassignment unless explicitly disconnected first. Both comply with the spine, but the webhook router and operator panel will disagree on tenant ownership after a relink.

Required spine tightening:

- State the cardinality as a DB-enforced invariant: one WhatsApp account per tenant, one tenant per `meta_phone_number_id`, or both.
- Define reassignment behavior: reject, transfer with audit, or disconnect old tenant then link new tenant.
- Define whether manual linkage can update `tenant_id` on conflict.
- Define what happens to existing message history if a phone number is reassigned.

## Bottom Line

The spine is not yet a safe build substrate for parallel implementation. It captures the intended architecture, but it leaves the contracts at the exact places where independently compliant builders will fork: service ownership, DTOs, operator identity, scoped repository APIs, audit placement, and WhatsApp relinking semantics.
