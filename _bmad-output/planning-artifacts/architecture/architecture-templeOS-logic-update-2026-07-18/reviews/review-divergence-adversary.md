# Divergence Adversary Review - Logic Update Architecture Spine

Reviewed artifact: `_bmad-output/planning-artifacts/architecture/architecture-templeOS-logic-update-2026-07-18/ARCHITECTURE-SPINE.md`

Lens: construct pairs of implementation units one level below the spine that can obey every AD and still produce incompatible logic. The focus is shared data shape clashes, ownership conflicts, ambiguous route/session behavior, actor/audit ambiguity, and tenant boundary gaps.

## Verdict

Needs revision before parallel implementation handoff.

The spine makes the correct high-level cuts: tenant and super-admin sessions split, tenant login is host-resolved, people are global, memberships are tenant-scoped, and privileged writes fail closed through `audit_log`. The remaining problem is contract precision. Several implementation units can independently satisfy every AD while disagreeing on the exact schema, payloads, route behavior, audit actor semantics, and ownership boundaries needed to compose safely.

## Divergence Findings

### 1. Schema/types and auth repositories can obey the ADs while disagreeing on the membership contract.

Implementation pair:

- Unit A: reset schema and `types/db.ts`.
- Unit B: `lib/auth/tenant-session.ts`, `app/api/auth/session/route.ts`, `lib/db/tenant-memberships.ts`, and `lib/auth/capabilities.ts`.

Unit A can follow AD-3, AD-8, AD-9, AD-12, and inherited AD-12 by creating `persons`, `tenant_memberships`, and `tenant_membership_roles`, removing `admin_users`, and making authored records point at `tenant_membership_id`. Unit B can follow the same ADs by resolving Firebase phone to a person, loading an active membership, loading roles, and putting `{ tenantId, personId, membershipId, roles, exp }` into the tenant session.

They can still build incompatible logic because the spine does not define the actual membership and role-assignment data contract. It does not say whether `tenant_memberships` is unique on `(tenant_id, person_id)`, whether membership has `display_name`, `active`, `status`, `created_by_membership_id`, or `created_by_super_admin_id`, whether `tenant_membership_roles` references role definitions by `role_definition_id` or `role_code`, or whether active state lives on membership rows, role rows, both, or neither. It also does not define whether a session stores role codes only, capabilities only, or both.

Concrete incompatible outcomes:

- Schema stores `tenant_membership_roles.role_definition_id`, while the capability resolver expects role codes in the session.
- Auth requires an `active` membership flag, while schema models deactivation through nullable `ended_at`.
- Member management creates multiple membership rows over time for the same `(tenant_id, person_id)`, while auth assumes one active row and picks the first.
- TypeScript exposes `createdByMembershipId`, while SQL names or relationships are implemented differently enough that repository authors map actor fields inconsistently.

Required spine tightening:

- Add canonical table-level shape for `persons`, `tenant_memberships`, `tenant_membership_roles`, and the actor columns affected by AD-8.
- Define uniqueness rules, active/deactivated semantics, and the one true role reference key.
- Define whether session payload stores `roles`, `capabilities`, or both, and which layer owns conversion.
- Add acceptance checks for duplicate membership prevention and deactivated-role exclusion.

### 2. Host resolution and route guards can both be correct yet allow cross-subdomain session drift.

Implementation pair:

- Unit A: `lib/auth/tenant-resolution.ts` and `app/api/auth/session/route.ts`.
- Unit B: dashboard layouts, tenant API guards, middleware, and cookie configuration.

Unit A can obey AD-1 and AD-2 by resolving `req.headers.host` during login, rejecting apex hosts, and setting a `templeos_tenant_session` for the resolved tenant. Unit B can obey AD-6 by ignoring client-supplied `tenantId` and scoping repositories to `session.tenantId`.

Those choices still do not guarantee that the request host and the tenant in the existing session continue to match. The spine only requires host resolution before session creation. It does not say that every tenant request must re-resolve the host and compare it to `session.tenantId`, nor does it define cookie domain/path policy across `*.trytempleos.com`.

Concrete incompatible outcomes:

- Auth sets a domain-wide cookie for `.trytempleos.com`; a user logs into `a.trytempleos.com`, then navigates to `b.trytempleos.com`, and Unit B correctly uses the signed session's `tenantId=A` on Host B because AD-6 says tenant APIs derive tenant identity only from the tenant session.
- Auth sets host-only cookies and Unit B expects a domain-wide cookie for shared local development or preview behavior.
- Middleware redirects unknown hosts before auth, while the session route implements the dev-only override internally; local development works for one unit and fails for the other.
- Dashboard server components show Tenant A data while browser URL, tenant chrome, or route assumptions suggest Tenant B.

Required spine tightening:

- State whether tenant route guards must re-resolve request host and assert `resolvedTenantId === session.tenantId`.
- Define cookie domain, path, `SameSite`, and host-only versus wildcard-subdomain behavior for tenant and super-admin sessions.
- Define the exact production ban for local tenant host override and where it is allowed to run.
- Add acceptance checks for using a valid Tenant A cookie on Tenant B's host.

### 3. Capability resolution and member management can diverge on what roles are assignable and what access they grant.

Implementation pair:

- Unit A: `role_definitions` seeds and `lib/auth/capabilities.ts`.
- Unit B: `app/api/members/*`, Members/Roles UI, and tenant route capability checks.

Unit A can obey AD-5 and inherited AD-18 by loading `role_definitions.capability_set` and refusing raw role checks. Unit B can obey AD-7 by allowing tenant admins with `members.manage` to assign allowed tenant roles inside `session.tenantId`.

They can still disagree because this spine does not restate the canonical V0 capability set or the serialized `capability_set` shape. It says "require at least one role with dashboard access" and suggests helpers such as `requireTenantCapability("dashboard.access")`, but it does not define the seed payloads, whether `admin` is the only V0 dashboard role, whether `priest` and `committee_member` may enter the dashboard through future identity capabilities, or how "allowed tenant roles" are represented.

Concrete incompatible outcomes:

- Role seed stores `capability_set` as JSON arrays like `["dashboard.access"]`; resolver expects an object like `{ "dashboard.access": true }`.
- UI permits assigning `devotee` membership role because it is in the fixed role list; auth excludes it from dashboard access; member list then shows a "member" who cannot log in, which may be intended but is not specified in this spine.
- Route refactor uses broad `dashboard.access` for all content mutations, while role seed gives only `admin` dashboard access; priests cannot create events even if product copy or UI labels imply priest workflows.
- Tenant-admin route rejects assignment of `admin` to another member to prevent privilege spread, while the Members UI assumes `members.manage` includes role assignment for all V0 tenant roles.

Required spine tightening:

- Include canonical V0 role-to-capability seed data in this spine or bind to a specific companion contract.
- Define the JSON shape of `role_definitions.capability_set`.
- Define which roles are assignable by tenant admins in V0 and whether tenant admins may assign `admin`.
- Define whether non-dashboard identity roles can be members without dashboard access and how the UI should label that distinction.

### 4. Authored-record actor fields and audit actors are ambiguous enough to produce incompatible histories.

Implementation pair:

- Unit A: events, donations, and tenant content repositories.
- Unit B: `lib/db/audit-log.ts`, provisioning service, member/role routes, and WhatsApp linkage.

Unit A can obey AD-8 by storing `created_by_membership_id` and `recorded_by_membership_id` for tenant-authored records and leaving nullable actor fields for system/provider writes. Unit B can obey AD-11 and inherited AD-6 by writing `audit_log` in the same transaction for privileged mutations.

The spine does not define how the actor model spans membership actors, super-admin actors, and system/provider actors. It names `actor_type`, `actor_id`, `tenant_id`, `action`, `target_type`, `target_id`, and metadata, but it does not define enum values, FK policy, nullability, target naming, or how to represent global actions such as role catalog changes where `tenant_id` may be null. It also does not say whether tenant content actor fields need validation that `created_by_membership_id` belongs to the same `tenant_id` as the record.

Concrete incompatible outcomes:

- Audit uses `actor_type = "super_admin"` with `actor_id = super_admins.id`; tenant member changes use `actor_type = "tenant_member"` with `actor_id = tenant_memberships.id`; another unit uses `actor_type = "person"` with `actor_id = persons.id` plus metadata membership context.
- Role catalog audit has no tenant target, but schema makes `audit_log.tenant_id` non-null because most privileged actions are tenant-scoped.
- Event repository accepts `createdByMembershipId` without checking membership tenant, so a multi-temple person's Temple A membership can author a Temple B event if a caller passes the wrong ID.
- WhatsApp webhook actions use nullable actor fields in content tables, while audit logging tries to record provider writes as `actor_type = "system"` and fails if `actor_id` is required.

Required spine tightening:

- Define audit actor enum values and FK/nullability rules for `super_admin`, `tenant_membership`, `system`, and provider/webhook actors.
- Define whether `audit_log.tenant_id` is nullable for global privileged actions.
- Require authored-record repositories to assert actor membership belongs to the same tenant as the written record.
- Define canonical action and target naming for member creation, role assignment, role definition change, provisioning, and WhatsApp linkage.

### 5. Tenant member management and control-plane provisioning have overlapping ownership of person, membership, and role mutations.

Implementation pair:

- Unit A: `lib/provisioning/temples.ts`, super-admin temple APIs, and provisioning scripts.
- Unit B: tenant-local `app/api/members/*`, member repositories, and Members/Roles UI.

Unit A can obey AD-10 and the inherited provisioning ADs by making `provisionTemple` create a tenant, domain, first member, first roles, and optional WhatsApp account through one transaction. Unit B can obey AD-7 by letting tenant admins create/reuse a person by phone, create or reactivate membership, and assign roles inside `session.tenantId`.

They can still disagree on which service owns reusable person/membership/role mutation semantics. The spine says provisioning scripts become control-plane wrappers and member management becomes tenant-local, but it does not define whether both paths call shared lower-level membership services or whether the provisioning service directly orchestrates repositories while member routes implement their own orchestration.

Concrete incompatible outcomes:

- Provisioning creates the first admin membership through a private service that enforces `firstMember.roles` includes `admin`; tenant member routes use a different role assignment path with different audit action names and duplicate handling.
- Tenant member management reactivates an old membership and preserves old roles; provisioning tries to add the same first member later and errors on uniqueness instead of reactivating.
- One unit treats person `displayName` as global and updates `persons.display_name`; another treats display name as tenant-specific and stores it on membership or devotee profile.
- CLI provisioning and tenant UI normalize phone numbers at different layers, creating duplicate person records or failing to match existing people.

Required spine tightening:

- Define a shared membership mutation service or explicitly require both provisioning and member routes to call the same repository functions with identical duplicate/reactivation semantics.
- Define where phone normalization and display-name ownership live.
- Define duplicate-first-member behavior during provisioning.
- Define audit action parity between super-admin first-member creation and tenant-admin member creation.

### 6. WhatsApp devotee linking and global person creation are not precise enough to preserve tenant boundaries.

Implementation pair:

- Unit A: WhatsApp webhook, devotees repository, and `whatsapp_accounts` tenant routing.
- Unit B: person repository, tenant login, member management, and devotee-person linking.

Unit A can obey AD-9 by keeping devotees keyed by `tenant_id` and phone, resolving tenant from `whatsapp_accounts.meta_phone_number_id`, and never granting dashboard access from a devotee row. Unit B can obey AD-3 and AD-9 by creating/reusing `persons` during login/member management and linking `devotees.person_id` when a matching person exists.

They can still build incompatible linking behavior because the spine says devotees "may be linked" to a person but does not define when, who owns the link, whether webhook code may create persons, whether manual member creation should backfill devotee links, or whether phone normalization is identical across WhatsApp phones and Firebase phones.

Concrete incompatible outcomes:

- Webhook never creates persons and only links if `persons.phone_number` already exists; member management creates a person later but does not backfill the existing devotee row.
- Member management creates a person by phone and backfills all matching devotees across tenants; webhook/unit expectations require tenant-local linking only.
- Firebase phone normalization includes country-code canonicalization while WhatsApp stores raw E.164 or provider-formatted strings, so the same human never links.
- A person who is a dashboard member in Temple B and a WhatsApp devotee in Temple A is linked globally without role leakage, but audit/UI display may imply cross-temple identity in places that expected tenant-only devotee profiles.

Required spine tightening:

- Define the exact normalized phone format shared by Firebase, persons, devotees, and WhatsApp provider data.
- Define whether webhook code may create `persons` or only attach existing ones.
- Define when member management/login backfills `devotees.person_id`, and whether that backfill is tenant-local only.
- Add acceptance checks for same phone as devotee in one tenant, member in another tenant, and later member in the first tenant.

## Bottom Line

The spine is directionally sound but not yet a safe substrate for independently staffed implementation. The highest-risk missing contracts are the membership/role schema shape, host-session consistency, capability seed contract, audit actor model, shared membership mutation ownership, and WhatsApp/person linking semantics. Tightening those contracts would turn the ADs from architectural intent into implementation-grade boundaries.
