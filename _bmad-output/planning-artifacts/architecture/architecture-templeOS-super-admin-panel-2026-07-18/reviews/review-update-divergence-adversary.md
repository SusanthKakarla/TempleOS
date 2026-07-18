# Update Divergence Adversary Review - Architecture Spine

Reviewed artifact: `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md`

Lens: after the AD-8 through AD-15 update, construct two downstream builders who follow every architecture decision, then test whether they can still diverge on person identity, tenant membership, role definitions/assignments, subdomain login, or migration from `admin_users`/`devotees`.

## Verdict

Needs targeted revision before implementation handoff.

The update closes the broad divergence found in the earlier review: operator identity, canonical provisioning functions, DTO naming, repository scoping, WhatsApp reassignment, person identity, role governance, subdomain login, and devotee profile scoping are now explicit. The remaining problem is not the desired future model. The problem is the cutover contract from the current checkout's `admin_users` and `devotees` tables into the new `persons`, `tenant_memberships`, `tenant_membership_roles`, and `tenant_domains` model.

Two builders can now follow every AD and still ship incompatible migration behavior, login compatibility, role mapping, and devotee/person linking.

## Downstream Builders

### Builder A - Forward Model Builder

Builder A owns:

- `lib/db/persons.ts`
- `lib/db/tenant-memberships.ts`
- `lib/db/role-definitions.ts`
- `lib/db/tenant-domains.ts`
- `lib/provisioning/temples.ts`
- new operator APIs that use the forward model only

Builder A follows the ADs by:

- resolving Firebase phone identity to exactly one global `person`;
- creating first admins as tenant memberships with an `admin` role;
- treating `role_definitions.code` as the only permission source;
- resolving temple login by hostname through `tenant_domains`;
- keeping `devotees` as tenant-owned profiles that may optionally reference `person_id`;
- treating `admin_users` as a transitional repository that new operator provisioning no longer writes.

Likely implementation choices:

- migration creates `persons`, `tenant_memberships`, and `tenant_membership_roles`;
- `admin_users.role = 'super_admin'` maps to `admin`;
- `admin_users.role = 'admin'` maps to `admin`;
- login checks only `tenant_memberships` after the new auth route lands;
- existing `admin_users` records are read only for a temporary compatibility screen, or not at all;
- `devotees.person_id` is attached opportunistically when a phone matches a `person`, but missing links are allowed.

### Builder B - Compatibility Builder

Builder B owns:

- existing tenant dashboard auth and admin-management routes;
- `lib/db/admin-users.ts`;
- `lib/db/devotees.ts`;
- migration/backfill scripts;
- current dashboard flows for events, donations, devotees, and WhatsApp activity.

Builder B follows the ADs by:

- preserving tenant dashboard behavior until every route has moved to membership authorization;
- keeping `admin_users` as the source of truth during transition because existing sessions, events, donations, and admin-management routes still reference it;
- backfilling `persons` from both `admin_users` and `devotees`;
- preserving current `super_admin` semantics as a high-privilege tenant-local admin role;
- allowing subdomain login to resolve a tenant, then falling back to `admin_users` if no membership exists yet.

Likely implementation choices:

- migration creates `persons` for all unique phones across `admin_users.phone_number` and `devotees.whatsapp_phone`;
- `admin_users.role = 'super_admin'` maps to `admin` plus a stronger tenant-local capability;
- `admin_users.role = 'admin'` maps to a narrower `committee_member` or normal dashboard role;
- login accepts either a matching `tenant_membership` or a matching active `admin_users` row during the cutover;
- devotees with matching phone numbers are eagerly linked to `persons`, even if that makes an admin also a devotee profile in the same tenant.

Both builders can cite the spine. Their outputs do not compose.

## Findings

### 1. `admin_users` migration is not deterministic enough.

AD-12 says global phone identity becomes `persons`; AD-13 says platform role definitions are canonical; the conventions say existing tenant `super_admin` maps to forward `admin`. The current checkout still has `admin_users.phone_number UNIQUE`, `admin_users.role IN ('super_admin', 'admin')`, tenant sessions keyed by `adminId`, and foreign keys from `events.created_by` and `donations.recorded_by` to `admin_users`.

Builder A can comply by treating both legacy roles as the forward `admin` membership role because the convention explicitly says existing tenant `super_admin` maps to `admin`. Builder B can comply by preserving the operational difference between legacy `super_admin` and `admin`, because the current product has tenant-local admin-management permissions attached to `super_admin`.

The divergence is severe: one implementation collapses tenant-local privilege levels during migration, while the other preserves them through capability mappings or a second role. Both follow the ADs, but they will disagree on who can manage members immediately after cutover.

Required tightening:

- Add a dedicated migration AD or table that maps each legacy `admin_users.role` to exact forward `role_code` assignments and capabilities.
- State whether legacy `admin_users.admin` becomes forward `admin`, `committee_member`, or another role.
- State whether legacy `super_admin` loses its special tenant-local meaning, maps to `admin` plus capabilities, or is preserved under a differently named forward role.
- State what happens to `events.created_by` and `donations.recorded_by`: keep legacy FK, add membership/person audit columns, or migrate references.

### 2. Cutover source of truth for tenant login is still ambiguous.

AD-14 says temple-owned login resolves hostname through `tenant_domains`, then Firebase phone OTP proves the person, then memberships and membership roles determine access. AD-1 and AD-12 support that future state. The structural seed also keeps `admin-users.ts` as a transitional repository until membership migration.

Builder A can comply by making new subdomain login reject any phone without a `tenant_membership`. Builder B can comply by using `admin_users` as a transitional fallback so existing admins are not locked out before backfill or data repair completes.

Those are incompatible user-visible outcomes. On the same database, a pilot admin who exists only in `admin_users` can either get a valid session or receive `403`, and both builders can claim they followed the spine.

Required tightening:

- Define the exact login cutover sequence: backfill first, dual-read period, then membership-only, or immediate membership-only.
- Define whether `admin_users` is ever consulted by the new subdomain login route.
- Define the tenant session payload after migration: `membershipId + personId + tenantId + roles`, legacy `adminId + tenantId`, or both during transition.
- Define when `admin_users` can stop being written and when it can stop being read.

### 3. Global person creation from admin and devotee phones can fork.

AD-12 makes `persons.phone_number` globally unique. AD-15 says `devotees` remains tenant-specific and may attach to a global `person`. The convention says phone numbers are normalized before writes. The current checkout has two legacy phone columns with different meanings: `admin_users.phone_number` for dashboard authorization and `devotees.whatsapp_phone` for tenant-scoped devotee profiles.

Builder A can comply by creating a `person` only when someone authenticates or is provisioned as a member, then linking devotees lazily if a matching person exists. Builder B can comply by backfilling `persons` from every `devotees.whatsapp_phone` so the global identity table contains everyone who has messaged a temple. Both honor "may attach" and global uniqueness, but they produce different `persons` cardinality, different duplicate-handling behavior, and different future login results.

The sharpest edge case is the same phone appearing as an admin in Temple A and a devotee in Temple B. One builder will create one person with one membership plus an unattached devotee profile. The other will create one person, link both tenant devotee/admin records, and may accidentally make future "person detail" screens appear cross-temple-aware before the product is ready.

Required tightening:

- State which legacy tables seed `persons` during migration: `admin_users`, `devotees`, both, or neither until login.
- Define whether `devotees.person_id` backfill is mandatory, opportunistic, or deferred.
- Define conflict behavior when normalized phones collide across admin/devotee rows with different display names.
- Define whether a person without a tenant membership may exist solely because they are a devotee.

### 4. Role definition and assignment bootstrap lacks exact required rows.

AD-13 says platform operators define and maintain global role definitions and capability mappings. AD-9 defines `RoleCode = "admin" | "priest" | "committee_member" | "volunteer" | "devotee"`. The minimum schema has `role_definitions(code UNIQUE, capability_set, active)`, but the spine does not specify seed timing, required capability keys, active/inactive behavior, or whether `devotee` is an authorization role or merely a profile category.

Builder A can comply by seeding all five role definitions before provisioning and assigning `devotee` only when a devotee gets website login. Builder B can comply by treating `devotee` as a role assigned to every `devotees.person_id` during backfill because the type includes it. Both follow the AD text; they will diverge on whether "devotee" is a login-authorized tenant membership, a non-login profile, or both.

This creates downstream ambiguity for member-management UI, access checks, and migration tests. It also decides whether a WhatsApp-only devotee becomes visible in the same table as committee members and priests.

Required tightening:

- List the required V0 `role_definitions` rows and capability sets.
- State whether `devotee` role assignment is created for WhatsApp-only devotees in V0.
- State whether `tenant_memberships` represents all temple-associated people or only login-capable/permission-bearing people.
- State whether member-management UI may assign `devotee`, or whether devotee profile management remains separate for now.

### 5. Subdomain login hostname contract is still under-specified for local, preview, and apex hosts.

AD-14 says login starts by resolving request hostname through `tenant_domains`; the convention says use normalized unique tenant slugs for `*.templeos.com`; generic `templeos.com` tenant picker is deferred. That is enough for production subdomains, but not enough for builders wiring Next.js middleware, Firebase callback pages, local development, or Railway preview hosts.

Builder A can comply by storing full hostnames like `ddk.templeos.com` in `tenant_domains.hostname` and requiring exact host matches. Builder B can comply by storing slugs like `ddk` and composing the hostname from environment config, because the DTO calls the input `subdomain`. Both follow the spine's wording, but login resolution, validation errors, and operator provisioning uniqueness will differ.

The same ambiguity exists for `localhost`, apex `templeos.com`, `www.templeos.com`, and preview URLs. One builder may reject them because tenant picker is deferred. Another may add bypass behavior for local dev. Both are defensible unless the contract is explicit.

Required tightening:

- State whether `tenant_domains.hostname` stores full hostnames or slugs.
- Define canonical normalization: lowercase, trim, allowed characters, reserved names, and whether ports are stripped.
- Define local development and preview-host behavior.
- Define what apex/generic host login routes do in V0: hard reject, marketing page only, operator login only, or environment-selected pilot tenant.

## Bottom Line

The updated spine is materially stronger than the earlier version, but it still leaves the transition from the existing one-tenant schema to the forward multi-tenant identity model too open. The fix is not more architecture prose. Add a migration/cutover contract covering `admin_users`, `devotees`, required role seeds, subdomain hostname storage, login dual-read behavior, and retirement criteria for legacy auth.
