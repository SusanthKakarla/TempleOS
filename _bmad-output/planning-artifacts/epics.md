---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/templeos-mvp-prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/IMPLEMENTATION-PLAN.md
---

# templeOS - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for templeOS, decomposing the requirements from the PRD and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-001: The system shall support Firebase phone OTP login for tenant admins.
FR-002: The system shall verify Firebase ID tokens server-side.
FR-003: The system shall deny dashboard access to non-allowlisted phone numbers.
FR-004: The original MVP shall support only the tenant admin role, but the Super Admin slice supersedes this with the V0 platform-governed role catalog described in FR-025 through FR-043.
FR-005: The system shall store tenant-owned records with `tenant_id`.
FR-006: The original MVP shall support one seeded pilot tenant, while the Super Admin slice shall support super-admin-controlled multi-temple provisioning.
FR-007: The original MVP shall not expose tenant creation, approval, or switching UI; the Super Admin slice shall expose only privileged super-admin tenant provisioning, not public self-serve onboarding.
FR-008: The system shall allow tenant admins to create, edit, publish, and unpublish events.
FR-009: Events shall include title, description, location, start time, optional end time, and status.
FR-010: Deferred - WhatsApp event discovery shall show only published upcoming events in a later WhatsApp slice.
FR-011: Deferred for WhatsApp inbound - the system shall later auto-create devotees from inbound WhatsApp messages; this active slice covers manual dashboard devotee management.
FR-012: The system shall allow tenant admins to manually add devotees.
FR-013: The system shall allow tenant admins to edit devotee profile fields.
FR-014: Devotees shall include optional DOB, birth star/nakshatram, and gothram/ancestral lineage.
FR-015: The system shall distinguish opted-in devotees from manually added non-opted-in devotees.
FR-016: Deferred - the system shall integrate with Meta WhatsApp Cloud API in a later WhatsApp slice.
FR-017: Deferred - the system shall support webhook verification in a later WhatsApp slice.
FR-018: Deferred - the system shall receive and log inbound WhatsApp messages in a later WhatsApp slice.
FR-019: Deferred - the system shall send deterministic menu responses in a later WhatsApp slice.
FR-020: Deferred - the system shall send event announcement messages only to opted-in devotees in a later WhatsApp slice.
FR-021: Deferred - the system shall log outbound messages and statuses in a later WhatsApp slice.
FR-022: The active dashboard shall include Home, Events, Devotees, and tenant member management; WhatsApp Activity is deferred with the WhatsApp slice.
FR-023: The dashboard shall show basic home metrics.
FR-024: Deferred - the dashboard shall show recent WhatsApp activity in a later WhatsApp slice.
FR-025: The system shall support super-admin phone OTP login using `super_admins.phone_number`.
FR-026: The system shall bootstrap the first super-admin through an explicit CLI command or reset-time seed.
FR-027: The system shall store super-admin sessions separately from tenant sessions with a distinct cookie name and payload `{ superAdminId, phoneNumber, displayName, exp }`.
FR-028: The system shall create and maintain global `persons` keyed by normalized phone number.
FR-029: The system shall create and maintain `tenant_memberships` as the source of tenant login and tenant relationship truth.
FR-030: The system shall create and maintain `tenant_membership_roles` so a person can hold multiple tenant-scoped roles.
FR-031: The system shall seed V0 role definitions for `admin`, `priest`, `committee_member`, `volunteer`, and `devotee`.
FR-032: The system shall treat the V0 `admin` role as dashboard access plus tenant member and role management inside the tenant.
FR-033: The system shall treat V0 `priest`, `committee_member`, and `volunteer` roles as identity markers without extra V0 dashboard permissions.
FR-034: The system shall treat V0 `devotee` as a tenant relationship marker, not automatic dashboard login permission.
FR-035: The system shall expose a Super Admin UI at `/super-admin` for listing temples and viewing basic temple status.
FR-036: The system shall expose `/super-admin/temples/new` for provisioning a temple with tenant details, subdomain, first member, first member roles, and optional WhatsApp account details.
FR-037: The system shall expose Super Admin APIs for listing, provisioning, viewing, and updating temples.
FR-038: The system shall expose Super Admin APIs for role definitions and tenant member role assignment.
FR-039: The system shall provision temples through one canonical `provisionTemple` service that creates tenant, tenant domain, first person, first membership, first member roles, optional WhatsApp mapping, and audit record in one transaction.
FR-040: The system shall expose a CLI wrapper over the canonical provisioning service for explicit temple provisioning.
FR-041: The system shall resolve tenant dashboard login from `tenant_domains.hostname` before membership authorization.
FR-042: The system shall replace tenant-local admin management with tenant member management by phone number and allowed tenant-scoped roles.
FR-043: The system shall support manual Super Admin WhatsApp account linkage with at most one active WhatsApp account per tenant and no V0 reassignment of an existing Meta phone number ID to another tenant.

### NonFunctional Requirements

NFR-001: All database queries that read or write tenant-owned data must be tenant scoped.
NFR-002: SQL must be parameterized.
NFR-003: Raw SQL must be isolated behind repository/data-access modules.
NFR-004: The application must be deployable on Railway.
NFR-005: The database must run on Railway Postgres.
NFR-006: Schema changes must be managed through SQL migration files.
NFR-007: Deferred - the webhook endpoint must respond within Meta's expected timeout window when the WhatsApp slice is implemented.
NFR-008: Secrets must be provided through environment variables, not committed.
NFR-009: Deferred - the WhatsApp flow must avoid AI-generated answers when the WhatsApp slice is implemented.
NFR-010: Super-admin authorization must be separate from tenant-admin authorization.
NFR-011: Tenant dashboard APIs must derive `tenant_id` only from the resolved tenant session.
NFR-012: Deferred - WhatsApp webhooks must derive `tenant_id` only from `whatsapp_accounts.meta_phone_number_id` when the WhatsApp slice is implemented.
NFR-013: Only super-admin-authorized APIs may accept explicit tenant IDs.
NFR-014: Privileged writes must produce durable audit records.
NFR-015: Phone numbers must be normalized before person, member, devotee, and super-admin matching.
NFR-016: Subdomain hostnames must be normalized to full lowercase hostnames without scheme, path, query, or port.
NFR-017: Validation errors must return `400`, missing or invalid sessions must return `401`, insufficient privilege must return `403`, and duplicate unique keys must return `409`.
NFR-018: Multi-table provisioning mutations must be transactional.
NFR-019: Local-only tenant host override must not run in production.
NFR-020: New production provisioning paths must not call `getPilotTenant()`.

### Additional Requirements

- The database reset for this slice starts directly from the forward schema: `super_admins`, `persons`, `tenant_memberships`, `tenant_membership_roles`, `role_definitions`, and `tenant_domains`.
- The old `admin_users` auth source and `getPilotTenant()` paths are historical checkout context only, not production migration constraints.
- `lib/provisioning/temples.ts` owns every mutation crossing tenant, person, membership, role, WhatsApp, and audit boundaries.
- Canonical provisioning DTOs must use domain names: `tenant`, `domain`, `firstMember`, `roles`, and `whatsappAccount`.
- `firstMember.roles` must include `admin` during provisioning.
- Super Admin UI routes and CLI commands must call canonical provisioning service functions rather than performing multi-table repository sequences directly.
- Tenant-owned repository functions must include `tenantId` in names and signatures unless they are explicit global lookup functions needed for login, subdomain resolution, or provider routing.
- Super-admin-only cross-tenant reads must use names such as `listTenantsForSuperAdmin` and `getTenantDetailForSuperAdmin`.
- `role_definitions` are platform-governed; role assignments are tenant-governed.
- Tenant admins may assign or remove allowed roles only inside their own tenant.
- `tenant_domains.hostname` stores full normalized hostnames such as `svtemple.trytempleos.com`.
- Apex and generic hosts such as `trytempleos.com` and `www.trytempleos.com` must not create tenant sessions.
- Super-admin login uses a separate super-admin route.
- `devotees` remains a tenant-owned profile and may link opportunistically to `persons.person_id`.
- WhatsApp-only devotees do not require `persons` rows and do not automatically receive a `devotee` membership role in V0.
- The Super Admin UI starts without tenant deletion, tenant transfer, tenant impersonation, data export, public signup, billing, approval queues, tenant switching, Meta embedded signup, webhook auto-registration, template approval workflows, or tenant-owned WhatsApp self-serve connection UI.
- Planned structural files include `app/(super-admin)/super-admin/page.tsx`, `app/(super-admin)/super-admin/temples/new/page.tsx`, `app/(super-admin)/super-admin/temples/[tenantId]/page.tsx`, and APIs under `app/api/super-admin`.
- Planned data-access files include `lib/db/super-admins.ts`, `lib/db/persons.ts`, `lib/db/tenant-domains.ts`, `lib/db/role-definitions.ts`, `lib/db/tenant-memberships.ts`, `lib/db/tenants.ts`, `lib/db/whatsapp-accounts.ts`, and `lib/db/audit-log.ts`.
- Planned scripts include `scripts/provision-temple.mts` and `scripts/seed-super-admin.mts`.
- Tests must cover provisioning transactions, authorization isolation, cross-tenant role isolation, subdomain login isolation, local host override safety, WhatsApp-only devotee login exclusion, and removal of the old `getPilotTenant()` footgun from new provisioning paths.

### UX Design Requirements

UX-DR1: The tenant admin dashboard must remain utilitarian and easy for a temple committee member to operate.
UX-DR2: Event creation must stay simple and must not feel like a full CMS.
UX-DR3: Devotee add and edit workflows must be clear and form-driven.
UX-DR4: WhatsApp Activity and WhatsApp linkage/status shell UI are deferred for now.
UX-DR5: Tenant dashboard UI must avoid platform-owner concepts such as tenants, billing, and system settings.
UX-DR6: Deferred - WhatsApp messages must be short when the WhatsApp slice is implemented.
UX-DR7: Deferred - WhatsApp menus must be number-based when the WhatsApp slice is implemented.
UX-DR8: Deferred - WhatsApp unknown-input recovery must guide devotees back to the menu when the WhatsApp slice is implemented.
UX-DR9: Deferred - WhatsApp flows must not ask devotees for DOB, birth star, gothram, registration, or payment when the WhatsApp slice is implemented.
UX-DR10: Deferred - WhatsApp flows must work for users who are not technically sophisticated when the WhatsApp slice is implemented.
UX-DR11: The Super Admin tenant list must show basic temple status including tenant details, subdomain, and admins or members. WhatsApp connected/unlinked state is deferred with Story 3.6.
UX-DR12: The Super Admin new-temple form must collect temple name, subdomain slug with generated full hostname, phone, address, timezone, first member phone and name, first member roles defaulting to `admin`, and optional WhatsApp phone, Meta phone number ID, and business account ID.
UX-DR13: Super Admin screens must avoid self-serve onboarding affordances such as public signup, billing, approval queue, embedded WhatsApp signup, tenant deletion, tenant transfer, impersonation, and data export.

### Deferred Scope Overrides

- WhatsApp devotee engagement is deferred for this active epic plan. Do not build webhook verification, inbound message handling, deterministic WhatsApp menus, WhatsApp event discovery, event announcements, outbound delivery, or live WhatsApp activity logs in this slice.
- Defer the read-only WhatsApp linkage/status shell from Story 3.6 for now. Active Super Admin operations should not add linked/unlinked WhatsApp status UI, mutation controls, embedded signup, disconnect, or transfer flows in this slice.
- The deferred WhatsApp requirements are FR-010, the inbound-auto-create portion of FR-011, FR-016, FR-017, FR-018, FR-019, FR-020, FR-021, the live-message portion of FR-024, Story 3.6's read-only linkage/status shell, and future full WhatsApp linkage management beyond provisioning-time optional data capture.

### FR Coverage Map

FR-001: Epic 1 and Epic 4 - Firebase phone OTP supports tenant admin login, then is exercised through the membership-scoped dashboard.
FR-002: Epic 1 and Epic 4 - Firebase ID tokens are verified server-side for tenant authentication.
FR-003: Epic 1 - Tenant dashboard access is denied unless the phone resolves to an active allowed membership.
FR-004: Epic 1 - The MVP tenant-admin-only model is replaced by the Super Admin slice's V0 platform role catalog.
FR-005: Epic 1 and Epic 4 - Tenant-owned records remain tenant-scoped in the new membership/session model.
FR-006: Epic 2 - Super Admin provisioning replaces the seeded-only pilot tenant path for new temples.
FR-007: Epic 2 - Privileged Super Admin provisioning is supported without exposing public tenant creation, approval, or switching UI.
FR-008: Epic 4 - Tenant admins can create, edit, publish, and unpublish events.
FR-009: Epic 4 - Events carry the required title, description, location, timing, and status fields.
FR-010: Deferred - WhatsApp event discovery is out of this active slice.
FR-011: Epic 4 for dashboard devotee management; deferred for auto-create from inbound WhatsApp.
FR-012: Epic 4 - Tenant admins can manually add devotees.
FR-013: Epic 4 - Tenant admins can edit devotee profile fields.
FR-014: Epic 4 - Devotee profiles include DOB, birth star/nakshatram, and gothram/lineage fields.
FR-015: Epic 4 - Opt-in state is preserved on devotee records; messaging use of opt-in is deferred.
FR-016: Deferred - Meta WhatsApp Cloud API integration is out of this active slice.
FR-017: Deferred - Webhook verification is out of this active slice.
FR-018: Deferred - Inbound WhatsApp receive/log behavior is out of this active slice.
FR-019: Deferred - Deterministic WhatsApp menu responses are out of this active slice.
FR-020: Deferred - Event announcements are out of this active slice.
FR-021: Deferred - Outbound message status logging is out of this active slice.
FR-022: Epic 4 - Tenant dashboard includes Home, Events, Devotees, and tenant member management; WhatsApp Activity is deferred.
FR-023: Epic 4 - Tenant dashboard Home shows basic metrics.
FR-024: Deferred for live WhatsApp activity; Epic 4 may keep dashboard navigation free of platform-owner concepts without implementing live activity.
FR-025: Epic 1 - Super admins authenticate by phone OTP against `super_admins.phone_number`.
FR-026: Epic 1 - First super-admin bootstrap is provided by CLI or reset-time seed.
FR-027: Epic 1 - Super-admin sessions use distinct cookie and payload shape.
FR-028: Epic 1 - Global `persons` are created and maintained by normalized phone number.
FR-029: Epic 1 - `tenant_memberships` become the source of tenant login and relationship truth.
FR-030: Epic 1 - `tenant_membership_roles` support multiple tenant-scoped roles per person.
FR-031: Epic 1 - V0 role definitions are seeded.
FR-032: Epic 1 - V0 `admin` grants dashboard access and tenant member/role management.
FR-033: Epic 1 - V0 `priest`, `committee_member`, and `volunteer` are identity markers without extra V0 dashboard permissions.
FR-034: Epic 1 - V0 `devotee` is a relationship marker, not automatic dashboard login permission.
FR-035: Epic 2 and Epic 3 - Super Admin UI lists temples, starts provisioning, and supports temple operations.
FR-036: Epic 2 - New-temple provisioning form captures temple, subdomain, first member, roles, and optional WhatsApp details.
FR-037: Epic 2 and Epic 3 - Super Admin APIs support temple list/provision/view/update.
FR-038: Epic 3 - Super Admin APIs support role definitions and tenant member role assignment.
FR-039: Epic 2 - `provisionTemple` performs canonical tenant provisioning in one transaction.
FR-040: Epic 2 - CLI provisioning wraps the canonical provisioning service.
FR-041: Epic 1 and Epic 4 - Tenant dashboard login resolves tenant from `tenant_domains.hostname` before membership authorization.
FR-042: Epic 3 and Epic 4 - Tenant-local admin management becomes member management by phone and tenant-scoped roles.
FR-043: Epic 2 for optional provisioning-time linkage. Epic 3 read-only linkage/status shell is deferred with Story 3.6; full manual linkage management remains deferred.

## Epic List

### Epic 1: Super Admin Access And Forward Identity Spine
Super admins can authenticate separately from tenant admins, and the app has the clean-start identity, role, membership, and tenant-domain model needed for multi-temple control.

**FRs covered:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032, FR-033, FR-034, FR-041

### Epic 2: Super Admin Temple Provisioning
A super admin can create a temple with its subdomain, first tenant admin/member, roles, optional WhatsApp linkage, and audit trail through one canonical provisioning path.

**FRs covered:** FR-006, FR-007, FR-035, FR-036, FR-037, FR-039, FR-040, FR-043

### Epic 3: Super Admin Temple Operations And Role Governance
A super admin can list/view/update temples, govern platform role definitions, assign tenant member roles, and inspect temple status without enabling public onboarding or dangerous lifecycle actions.

**FRs covered:** FR-035, FR-037, FR-038, FR-042, FR-043

### Epic 4: Tenant Admin Dashboard On Membership Auth
Tenant admins can use the existing temple dashboard through the new subdomain-derived membership session model to manage events, devotees, home metrics, and tenant members inside their tenant.

**FRs covered:** FR-001, FR-002, FR-005, FR-008, FR-009, FR-011, FR-012, FR-013, FR-014, FR-015, FR-022, FR-023, FR-041, FR-042

## Epic 1: Super Admin Access And Forward Identity Spine

Super admins can authenticate separately from tenant admins, and the app has the clean-start identity, role, membership, and tenant-domain model needed for multi-temple control.

### Story 1.1: Create Forward Identity Schema

As a platform operator,
I want the reset schema to include super-admins, persons, tenant memberships, roles, and tenant domains,
So that TempleOS starts from the multi-temple identity model.

**Acceptance Criteria:**

**Given** a clean database reset is run
**When** migrations are applied
**Then** the schema includes `super_admins`, `persons`, `tenant_domains`, `role_definitions`, `tenant_memberships`, and `tenant_membership_roles`
**And** the reset schema does not use `admin_users` as an auth source.

**Given** the identity tables exist
**When** phone-bearing rows are inserted into `super_admins` or `persons`
**Then** phone numbers are stored in normalized form
**And** uniqueness is enforced for normalized phone numbers where required.

**Given** tenant domains are inserted
**When** a hostname is stored
**Then** `tenant_domains.hostname` stores the full normalized hostname without scheme, path, query, or port
**And** duplicate hostnames are rejected.

**Given** tenant memberships are inserted
**When** a person is added to a tenant
**Then** the database prevents duplicate memberships for the same `tenant_id` and `person_id`
**And** roles are assigned through `tenant_membership_roles`, not columns on `persons`.

### Story 1.2: Seed V0 Roles And First Super Admin

As a platform operator,
I want fixed V0 role definitions and an explicit first-super-admin seed command,
So that privileged access is bootstrapped without tenant-admin shortcuts.

**Acceptance Criteria:**

**Given** role seed runs on a clean database
**When** the seed completes
**Then** `role_definitions` contains active role codes `admin`, `priest`, `committee_member`, `volunteer`, and `devotee`
**And** each role has the V0 capability meaning defined by the architecture.

**Given** the first-super-admin seed command is run with a phone number and display name
**When** no matching super-admin exists
**Then** an active `super_admins` row is created
**And** the command does not create a tenant membership for that super-admin.

**Given** the first-super-admin seed command is run for an existing normalized phone number
**When** the row already exists
**Then** the command updates only intended seed-safe fields or exits idempotently
**And** it does not create duplicate super-admin rows.

**Given** legacy pilot seed scripts still exist for local demo data
**When** production super-admin bootstrap is needed
**Then** the documented command targets `super_admins`
**And** it does not rely on `getPilotTenant()`.

### Story 1.3: Super Admin Phone OTP Session

As a super admin,
I want to log in with phone OTP using a separate super-admin session,
So that I can access platform controls without being confused with a tenant member.

**Acceptance Criteria:**

**Given** a phone number belongs to an active `super_admins` row
**When** Firebase phone OTP succeeds and the backend verifies the Firebase ID token
**Then** the backend creates a super-admin session payload containing `superAdminId`, `phoneNumber`, `displayName`, and `exp`
**And** the session uses a cookie name distinct from tenant dashboard sessions.

**Given** a phone number does not belong to an active `super_admins` row
**When** Firebase phone OTP succeeds
**Then** super-admin login is denied
**And** no super-admin session cookie is issued.

**Given** a user has only a tenant membership with the `admin` role
**When** the user calls a super-admin-protected route
**Then** `requireSuperAdmin()` rejects the request
**And** tenant role membership is not treated as platform authorization.

**Given** a request has no valid super-admin session
**When** it calls a super-admin route
**Then** the route returns `401`
**And** authenticated users without super-admin privilege receive `403`.

### Story 1.4: Tenant Login Resolves Membership By Subdomain

As a tenant admin,
I want login to resolve my temple from the subdomain and my membership from my phone number,
So that I only enter the intended temple dashboard.

**Acceptance Criteria:**

**Given** a user starts tenant login from an active tenant hostname
**When** Firebase phone OTP succeeds and the backend verifies the Firebase ID token
**Then** the backend resolves `tenant_id` from `tenant_domains.hostname`
**And** it creates a tenant session only if the normalized phone maps to a `person` with an active membership in that tenant.

**Given** the same person belongs to multiple temples
**When** the person logs in from one temple subdomain
**Then** the tenant session is created only for the tenant resolved from that hostname
**And** no client-supplied tenant selector is trusted.

**Given** a user starts login from `trytempleos.com`, `www.trytempleos.com`, or another generic host
**When** tenant login is attempted
**Then** no tenant session is created
**And** the user receives a clear invalid-tenant-context response.

**Given** local development uses a tenant host override
**When** the app runs outside production
**Then** the override can resolve the intended tenant for local testing
**And** the override is disabled or rejected in production.

### Story 1.5: Enforce Role-Based Tenant Dashboard Access

As a temple,
I want only members with the V0 admin role to access the tenant dashboard,
So that identity-marker roles do not accidentally grant management access.

**Acceptance Criteria:**

**Given** an active tenant membership has the `admin` role
**When** the member opens the tenant dashboard
**Then** dashboard access is allowed
**And** server-side route guards derive `tenantId`, `personId`, `membershipId`, and role codes from the tenant session.

**Given** an active tenant membership has only `priest`, `committee_member`, `volunteer`, or `devotee`
**When** the member opens the tenant dashboard
**Then** dashboard access is denied
**And** the denial uses `403` rather than falling back to super-admin authorization.

**Given** a tenant dashboard API reads or writes tenant-owned data
**When** the request is handled
**Then** the API derives `tenant_id` from the tenant session
**And** it does not accept a client-supplied tenant ID.

**Given** a super-admin session exists in the browser
**When** the user calls tenant dashboard APIs without a valid tenant session
**Then** the tenant route rejects the request
**And** super-admin cookies are not used as tenant membership proof.

### Story 1.6: Identity And Session Isolation Tests

As a platform operator,
I want tests proving super-admin and tenant-admin sessions cannot cross-authorize,
So that the new identity model is trusted before provisioning builds on it.

**Acceptance Criteria:**

**Given** automated tests run for identity and auth
**When** a tenant admin calls a super-admin route
**Then** the request is rejected
**And** the test proves tenant `admin` role does not satisfy `requireSuperAdmin()`.

**Given** automated tests run for tenant login
**When** a user belongs to Temple A and Temple B with different roles
**Then** login from Temple A hostname creates only a Temple A session
**And** Temple A role codes do not authorize Temple B requests.

**Given** automated tests run for generic host handling
**When** tenant login is attempted from apex or `www` hosts
**Then** no tenant session is created
**And** the invalid host behavior is asserted.

**Given** automated tests run in a production-like environment
**When** a local tenant host override is configured
**Then** the override is rejected
**And** the test prevents local-only tenant resolution from leaking into production.

## Epic 2: Super Admin Temple Provisioning

A super admin can create a temple with its subdomain, first tenant admin/member, roles, optional WhatsApp linkage, and audit trail through one canonical provisioning path.

### Story 2.1: Define Canonical Provisioning Contract

As a platform developer,
I want canonical provisioning DTOs and validation for tenant, domain, first member, roles, and optional WhatsApp account,
So that UI, API, and CLI all create the same tenant shape.

**Acceptance Criteria:**

**Given** provisioning input is accepted by API, UI, or CLI
**When** the input is mapped into the service layer
**Then** it uses a canonical `ProvisionTempleInput` shape with `tenant`, `domain`, `firstMember`, `roles`, and optional `whatsappAccount`
**And** UI-shaped payloads do not leak directly into repository calls.

**Given** a provisioning request includes a subdomain slug
**When** validation runs
**Then** the slug is checked for allowed characters and reserved names
**And** the stored domain is composed as a full normalized hostname.

**Given** a provisioning request includes first member roles
**When** validation runs
**Then** the roles must include `admin`
**And** every supplied role must match an active V0 role definition.

**Given** a provisioning request includes phone numbers
**When** validation runs
**Then** tenant contact, first member, and optional WhatsApp phone values are normalized before persistence
**And** invalid phone input produces a `400` validation response.

### Story 2.2: Provision Temple Transaction

As a super admin,
I want temple provisioning to create the tenant, domain, first person, first membership, role assignments, optional WhatsApp account, and audit record atomically,
So that partial setup cannot leave a broken temple.

**Acceptance Criteria:**

**Given** valid provisioning input and an authorized super-admin actor
**When** `provisionTemple(input, actor)` runs
**Then** it creates the tenant, tenant domain, first person, first tenant membership, first member role assignments, optional WhatsApp account, and audit log entry in one transaction
**And** it returns a `ProvisionTempleResult` containing the created tenant, domain, first member, roles, and WhatsApp account if provided.

**Given** the first member phone already maps to an existing `person`
**When** provisioning runs
**Then** the existing person is reused
**And** only one membership is created for that person and tenant.

**Given** any required write fails during provisioning
**When** the transaction exits
**Then** no partial tenant, domain, membership, role assignment, WhatsApp account, or audit entry remains committed
**And** the caller receives a stable error response.

**Given** a requested hostname or unique tenant slug already exists
**When** provisioning runs
**Then** the operation returns a `409` conflict
**And** it does not create a duplicate tenant shape.

**Given** optional WhatsApp details are supplied
**When** the Meta phone number ID is already linked to another tenant
**Then** provisioning rejects the request with `409`
**And** the existing WhatsApp account ownership is not reassigned.

### Story 2.3: Super Admin Provision Temple API

As a super admin,
I want a protected API to provision a temple,
So that platform UI and tools can create temples through the canonical service.

**Acceptance Criteria:**

**Given** an authenticated super admin calls `POST /api/super-admin/temples`
**When** the request body is valid
**Then** the route calls `provisionTemple(input, actor)`
**And** returns the provisioned temple summary.

**Given** a tenant admin or unauthenticated user calls `POST /api/super-admin/temples`
**When** authorization runs
**Then** the route rejects the request with `401` or `403`
**And** no provisioning service call is made.

**Given** the request body is invalid
**When** validation runs
**Then** the route returns `400`
**And** the response identifies the invalid fields without exposing secrets.

**Given** provisioning detects a duplicate unique key such as hostname or Meta phone number ID
**When** the route handles the service error
**Then** the route returns `409`
**And** the response is stable enough for the UI to show a specific conflict message.

### Story 2.4: Super Admin New Temple Form

As a super admin,
I want a form to enter temple, subdomain, first member, roles, and optional WhatsApp details,
So that I can provision a pilot temple without writing SQL.

**Acceptance Criteria:**

**Given** a super admin opens `/super-admin/temples/new`
**When** the page loads
**Then** the form includes temple name, subdomain slug, generated full hostname, contact phone, address, timezone, first member phone, first member display name, first member roles defaulting to `admin`, and optional WhatsApp phone, Meta phone number ID, and Meta business account ID.

**Given** the super admin edits the subdomain slug
**When** the value changes
**Then** the UI displays the normalized full hostname preview
**And** reserved names such as `www`, `admin`, `super-admin`, and `api` are blocked before submission.

**Given** the form is submitted with valid data
**When** the API returns success
**Then** the UI shows the created temple summary
**And** exposes the created subdomain and first admin/member details.

**Given** the API returns validation or conflict errors
**When** the form handles the response
**Then** field-level or section-level errors are shown
**And** the super admin does not lose entered non-secret form values.

**Given** the Super Admin provisioning UI is in scope
**When** the page is implemented
**Then** it does not expose public signup, approval queue, billing, tenant deletion, tenant transfer, impersonation, data export, or Meta embedded signup affordances.

### Story 2.5: Provision Temple CLI

As a platform operator,
I want a CLI command that provisions a temple through the same canonical service,
So that reset-time or scripted setup cannot drift from the UI path.

**Acceptance Criteria:**

**Given** a platform operator runs `provision:temple` with valid tenant, domain, first member, role, and optional WhatsApp inputs
**When** the command executes
**Then** it maps arguments or environment values into the same canonical `ProvisionTempleInput`
**And** calls `provisionTemple(input, actor)`.

**Given** required CLI inputs are missing or invalid
**When** the command validates input
**Then** it exits non-zero
**And** prints actionable missing-field or invalid-field information without printing secrets.

**Given** provisioning succeeds
**When** the command completes
**Then** it prints the created tenant ID, hostname, first member phone, assigned roles, and WhatsApp linkage status
**And** it does not require manual SQL follow-up.

**Given** older pilot seed scripts still exist
**When** the production provisioning command is inspected or tested
**Then** it does not call `getPilotTenant()`
**And** it requires an explicit tenant target or creates a tenant through the canonical service.

### Story 2.6: Provisioning Guardrail Tests

As a platform operator,
I want tests for transactionality, duplicate handling, authorization, audit logging, WhatsApp uniqueness, and `getPilotTenant()` exclusion,
So that provisioning is safe before broader operations are added.

**Acceptance Criteria:**

**Given** provisioning tests run with valid input
**When** `provisionTemple` completes
**Then** the test verifies tenant, domain, person, membership, role assignments, optional WhatsApp mapping, and audit log entry are all created together
**And** the returned result matches persisted data.

**Given** provisioning tests simulate a mid-transaction failure
**When** the service throws
**Then** the test verifies no partial tenant setup remains committed
**And** audit logging does not claim a successful provisioning.

**Given** duplicate person, hostname, and Meta phone number ID scenarios are tested
**When** provisioning handles each case
**Then** duplicate person phone is reused safely
**And** duplicate hostname or cross-tenant Meta phone number ID returns conflict.

**Given** authorization tests call Super Admin provisioning routes
**When** unauthenticated users or tenant admins attempt provisioning
**Then** the route rejects them
**And** only active super admins can call the canonical provisioning path through the API.

**Given** code or tests scan new provisioning paths
**When** the provisioning service, API, and CLI are checked
**Then** no new production provisioning path calls `getPilotTenant()`
**And** the old pilot-only lookup remains outside this slice's production setup path.

## Epic 3: Super Admin Temple Operations And Role Governance

A super admin can list/view/update temples, govern fixed platform role definitions, assign tenant member roles, and inspect temple status without enabling public onboarding or dangerous lifecycle actions.

### Story 3.1: List Temples For Super Admin

As a super admin,
I want to see all provisioned temples with subdomain, admin/member, and WhatsApp status,
So that I can understand platform setup at a glance.

**Acceptance Criteria:**

**Given** an authenticated super admin opens `/super-admin`
**When** the page loads
**Then** it fetches a protected list of provisioned temples
**And** each row shows tenant name, normalized hostname or missing-domain state, primary/admin member summary, WhatsApp linked/unlinked status, and last updated timestamp where available.

**Given** no temples have been provisioned
**When** the list page loads
**Then** the page shows an empty state
**And** it provides a path to the new temple provisioning form.

**Given** an unauthenticated user or tenant admin opens `/super-admin`
**When** authorization runs
**Then** access is denied
**And** no cross-tenant temple data is returned.

**Given** the list API is implemented
**When** it reads cross-tenant temple summaries
**Then** it uses a clearly named super-admin-only repository function such as `listTenantsForSuperAdmin`
**And** that function is not called from tenant dashboard APIs.

### Story 3.2: View Temple Detail For Super Admin

As a super admin,
I want to inspect one temple's tenant details, domain, members, roles, and WhatsApp linkage,
So that I can troubleshoot and verify setup.

**Acceptance Criteria:**

**Given** an authenticated super admin opens `/super-admin/temples/[tenantId]`
**When** the tenant exists
**Then** the page shows tenant details, domain details, member list, role assignments, and WhatsApp linkage status
**And** all displayed data is fetched through super-admin-protected APIs.

**Given** a requested tenant ID does not exist
**When** the detail API is called
**Then** the route returns `404`
**And** no unrelated tenant data is exposed.

**Given** a tenant admin tries to view another tenant through the Super Admin detail route
**When** authorization runs
**Then** the request is rejected with `403`
**And** tenant membership is not accepted as super-admin privilege.

**Given** the detail repository is implemented
**When** it reads cross-tenant data
**Then** it uses a clearly named super-admin-only function such as `getTenantDetailForSuperAdmin`
**And** tenant dashboard code cannot import or call it as a normal tenant-local helper.

### Story 3.3: Update Provisioned Temple Details

As a super admin,
I want to update safe temple fields such as name, contact phone, address, and timezone,
So that tenant setup can be corrected without destructive lifecycle actions.

**Acceptance Criteria:**

**Given** an authenticated super admin submits safe tenant detail changes
**When** `PATCH /api/super-admin/temples/[tenantId]` receives valid input
**Then** it calls `updateProvisionedTemple({ tenantId, tenant }, actor)`
**And** only allowed fields such as name, default contact phone, address, and timezone are updated.

**Given** the request attempts to update tenant slug, hostname ownership, deletion status, transfer ownership, billing, or impersonation settings
**When** validation runs
**Then** the request is rejected
**And** no out-of-scope lifecycle mutation occurs.

**Given** the safe update succeeds
**When** the transaction commits
**Then** a durable audit log entry records the super-admin actor, tenant, action, target, and metadata
**And** the updated temple detail is returned.

**Given** invalid data such as malformed phone or unsupported timezone is submitted
**When** validation runs
**Then** the route returns `400`
**And** field-specific errors are available to the UI.

### Story 3.4: Govern Fixed Platform Role Definitions

As a super admin,
I want to view and maintain the fixed V0 platform role catalog,
So that role meanings stay consistent across temples.

**Acceptance Criteria:**

**Given** an authenticated super admin views role definitions
**When** the role catalog loads
**Then** it shows the fixed V0 roles `admin`, `priest`, `committee_member`, `volunteer`, and `devotee`
**And** it displays each role's V0 meaning and active state.

**Given** V0 role governance is platform-owned
**When** tenant admins manage members
**Then** they can assign allowed existing roles only
**And** they cannot create, rename, or redefine role codes.

**Given** a super-admin role API is implemented
**When** it receives a request to create custom tenant-local roles
**Then** the request is rejected or omitted from the V0 surface
**And** tenant-local custom roles remain deferred.

**Given** the role catalog is seeded
**When** role assignment logic checks permissions
**Then** checks use stable role codes
**And** display labels do not drive authorization.

### Story 3.5: Assign Tenant Member Roles As Super Admin

As a super admin,
I want to assign or remove allowed roles for a member inside a tenant,
So that first setup and support corrections can be handled centrally.

**Acceptance Criteria:**

**Given** an authenticated super admin updates a tenant member's roles
**When** `PUT /api/super-admin/temples/[tenantId]/members/[membershipId]/roles` receives valid role codes
**Then** it calls `assignTenantMemberRoles` with the tenant ID, membership or person target, and role list
**And** the role assignments are scoped only to that tenant membership.

**Given** the same person belongs to multiple tenants
**When** roles are changed for one tenant membership
**Then** memberships and roles in other tenants are unchanged
**And** the response makes the target tenant context explicit.

**Given** a request includes an inactive or unknown role code
**When** validation runs
**Then** the route returns `400`
**And** no partial role assignment is committed.

**Given** a tenant admin without super-admin privilege calls the Super Admin role assignment route
**When** authorization runs
**Then** the request is rejected
**And** tenant admins must use tenant-local member management routes for their own tenant in Epic 4.

**Given** a super-admin role assignment succeeds
**When** the transaction commits
**Then** an audit log entry records the actor, tenant, target membership, assigned roles, and removed roles.

### Story 3.6: Show WhatsApp Linkage Status Shell (Deferred)

**Status:** Deferred for now. Do not create or implement this story in the active Epic 3 slice unless it is explicitly re-scoped later.

As a super admin,
I want to see whether a temple has WhatsApp linked or unlinked,
So that I can verify setup status while full linkage management remains deferred.

**Acceptance Criteria:**

**Given** an authenticated super admin views the temple list or temple detail page
**When** a temple has a WhatsApp account linked
**Then** the UI shows linked status with safe identifying details such as WhatsApp phone number and Meta phone number ID
**And** secrets or tokens are never displayed.

**Given** a temple has no WhatsApp account linked
**When** the super admin views the temple list or detail page
**Then** the UI shows an unlinked state
**And** the copy makes clear that manual linkage management is deferred for now.

**Given** full WhatsApp linkage editing is descoped
**When** the Super Admin operations UI is implemented
**Then** it does not expose update, disconnect, transfer, or embedded signup controls for WhatsApp
**And** any existing optional linkage remains limited to the provisioning flow from Epic 2.

**Given** WhatsApp status is read through a repository
**When** status is fetched
**Then** the query preserves one-account-per-tenant and one-Meta-phone-number-per-tenant assumptions
**And** it does not mutate linkage state.

### Story 3.7: Super Admin Operations Guardrail Tests

As a platform operator,
I want tests for cross-tenant reads, safe updates, role governance, member role assignment, and excluded lifecycle actions,
So that operations stay inside the V0 boundary.

**Acceptance Criteria:**

**Given** Super Admin list and detail tests run
**When** an active super admin requests cross-tenant temple data
**Then** summaries and detail are returned
**And** tenant admins or unauthenticated users are rejected.

**Given** safe update tests run
**When** allowed tenant fields are patched
**Then** the changes persist with an audit log entry
**And** disallowed lifecycle fields such as deletion, transfer, impersonation, billing, or data export are rejected.

**Given** role governance tests run
**When** role definitions are viewed or used for assignment
**Then** fixed V0 role codes are enforced
**And** tenant-local custom role creation is unavailable.

**Given** cross-tenant membership tests run
**When** a person's roles are changed in one tenant
**Then** roles in another tenant remain unchanged
**And** authorization checks use the tenant-scoped membership.

**Given** WhatsApp status shell remains deferred
**When** Super Admin operations guardrail tests run
**Then** active operations do not expose linked/unlinked WhatsApp status UI
**And** no update, disconnect, transfer, or embedded signup action is available.

## Epic 4: Tenant Admin Dashboard On Membership Auth

Tenant admins can use the existing temple dashboard through the new subdomain-derived membership session model to manage events, devotees, home metrics, and tenant members inside their tenant.

### Story 4.1: Tenant Dashboard Uses Membership Session

As a tenant admin,
I want dashboard routes and APIs to use my tenant membership session,
So that all dashboard access is scoped to the temple subdomain I logged into.

**Acceptance Criteria:**

**Given** a tenant member with the `admin` role logs in from an active tenant subdomain
**When** the dashboard session is created
**Then** the session contains `tenantId`, `personId`, `membershipId`, role codes, and expiry
**And** dashboard routes use that session as the only tenant context.

**Given** a tenant member has only `priest`, `committee_member`, `volunteer`, or `devotee`
**When** the member attempts to access the dashboard
**Then** access is denied
**And** V0 identity-marker roles do not grant dashboard permission.

**Given** a dashboard API receives a request
**When** the route reads or writes tenant-owned data
**Then** it derives `tenant_id` from the session
**And** ignores or rejects any client-supplied tenant ID.

**Given** legacy `admin_users` helpers still exist in checkout history or old code paths
**When** tenant dashboard auth is evaluated
**Then** membership and role tables are the source of truth
**And** `admin_users` is not used for access decisions.

### Story 4.2: Dashboard Home Shows Tenant Metrics

As a tenant admin,
I want a simple home dashboard with key temple activity metrics,
So that I can quickly see whether events and devotee records are working.

**Acceptance Criteria:**

**Given** a tenant admin opens the dashboard home
**When** metrics load
**Then** the page shows tenant-scoped counts for upcoming published events, draft events, devotees, and opted-in devotees where data exists
**And** no cross-tenant totals are shown.

**Given** the tenant has little or no data
**When** the home page loads
**Then** empty or zero states are clear and utilitarian
**And** the UI points to relevant tenant workflows such as Events or Devotees without showing platform-owner concepts.

**Given** a dashboard metric query runs
**When** it reads tenant-owned tables
**Then** the repository function requires `tenantId`
**And** SQL is parameterized.

**Given** a non-admin role or unauthenticated user requests home metrics
**When** authorization runs
**Then** the request is rejected
**And** no metric payload is returned.

### Story 4.3: Manage Events As Tenant Admin

As a tenant admin,
I want to create, edit, publish, and unpublish events,
So that devotees can see accurate upcoming temple events.

**Acceptance Criteria:**

**Given** a tenant admin creates an event
**When** required fields are valid
**Then** the event is saved with title, description, location, start time, optional end time, status, and `tenant_id` from the session
**And** the event can be saved as draft or published.

**Given** required event fields are missing or invalid
**When** the create or update request is submitted
**Then** the route returns `400`
**And** no invalid event is persisted.

**Given** a tenant admin edits an existing event in their tenant
**When** the update is saved
**Then** the event fields are updated
**And** publish/unpublish changes are reflected in event discovery data.

**Given** a tenant admin attempts to access another tenant's event by ID
**When** the route handles the request
**Then** the event is not returned or mutated
**And** the lookup is scoped by both `tenantId` and event ID.

**Given** the event UI is implemented
**When** a committee member uses it
**Then** the form remains simple and does not behave like a full CMS
**And** platform-owner concepts such as tenant settings or billing are absent.

### Story 4.4: Manage Devotee Profiles

As a tenant admin,
I want to view, add, and edit devotee profiles,
So that the temple can maintain useful devotee context without messaging non-opted-in devotees by accident.

**Acceptance Criteria:**

**Given** a tenant admin views devotees
**When** the list loads
**Then** only devotees for the session tenant are shown
**And** each row includes useful profile and interaction metadata where available.

**Given** a tenant admin manually adds a devotee
**When** phone number and optional display name are submitted
**Then** the devotee is created for the session tenant
**And** manually added devotees default to not opted in for WhatsApp announcements.

**Given** a tenant admin edits a devotee profile
**When** display name, DOB, birth star/nakshatram, or gothram/lineage fields are changed
**Then** the changes are saved for that tenant only
**And** profile fields from another tenant are not affected.

**Given** a duplicate phone number already exists for the same tenant
**When** a tenant admin tries to add it again
**Then** the route returns `409`
**And** the existing devotee is not duplicated.

**Given** a matching global `person` already exists for the normalized phone
**When** the devotee is created or updated
**Then** `devotees.person_id` may be linked opportunistically
**And** WhatsApp-only devotees are not forced to become login-capable members.

### Story 4.5: Manage Tenant Members And Roles

As a tenant admin,
I want to add members by phone number and assign allowed roles inside my temple,
So that the temple can manage admins, priests, committee members, volunteers, and devotee relationships locally.

**Acceptance Criteria:**

**Given** a tenant admin adds a member by phone number
**When** the phone number and display name are valid
**Then** the system creates or reuses a global `person`
**And** creates one active `tenant_membership` for the session tenant.

**Given** a tenant admin assigns roles to a member
**When** the selected role codes are active V0 roles
**Then** role assignments are saved for that tenant membership
**And** the same person's roles in other tenants are unchanged.

**Given** a tenant admin assigns `admin`
**When** the target member logs in from that tenant subdomain
**Then** the member can access the tenant dashboard
**And** server-side route guards enforce the `admin` role requirement.

**Given** a tenant admin assigns only `priest`, `committee_member`, `volunteer`, or `devotee`
**When** the target member logs in from that tenant subdomain
**Then** the member is recognized as a tenant member
**And** dashboard access remains denied in V0.

**Given** a tenant admin tries to create new role definitions or rename core roles
**When** the member management UI or API is used
**Then** the action is unavailable or rejected
**And** only platform-governed role codes can be assigned.

**Given** tenant member or role assignment changes are made
**When** the transaction commits
**Then** a durable audit log entry records the tenant-admin actor, tenant, target member, and role changes.

### Story 4.6: Tenant Dashboard Guardrail Tests

As a platform operator,
I want tests proving dashboard reads and writes are tenant-scoped under the membership session,
So that one temple cannot see or mutate another temple's data.

**Acceptance Criteria:**

**Given** tenant dashboard auth tests run
**When** members with V0 roles attempt dashboard access
**Then** only `admin` role members are allowed
**And** `priest`, `committee_member`, `volunteer`, and `devotee` roles are denied.

**Given** cross-tenant data tests run
**When** a Temple A admin requests Temple B events, devotees, or members by ID
**Then** the data is not returned or mutated
**And** every repository call under test includes `tenantId`.

**Given** tenant member management tests run
**When** a tenant admin assigns roles to a member
**Then** roles are scoped to that tenant membership
**And** the same person's roles in another tenant remain unchanged.

**Given** devotee opt-in tests run
**When** a manually added devotee is created
**Then** the devotee defaults to not opted in
**And** WhatsApp-only devotee records do not automatically become login-capable memberships.

**Given** dashboard implementation is scanned or tested
**When** tenant access is evaluated
**Then** `admin_users` and client-supplied tenant IDs are not used as auth sources
**And** super-admin sessions are not accepted as tenant membership sessions.
