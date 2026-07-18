# Rubric Walker Review - TempleOS Logic Update Architecture Spine

## Verdict

Needs revision before handoff. The spine passes the deterministic lint check and is directionally strong: it inherits the parent invariants, names the correct paradigm, splits tenant and super-admin auth, moves away from `admin_users`, and covers the main identity/membership/role/audit refactor points. The remaining issues are semantic divergence risks: independent implementers could make incompatible choices around tenant session freshness, host resolution in deployed environments, and whether tenant member mutations use the inherited canonical provisioning path.

## Inputs Reviewed

- `_bmad-output/planning-artifacts/architecture/architecture-templeOS-logic-update-2026-07-18/ARCHITECTURE-SPINE.md`
- `.agents/skills/bmad-architecture/references/reviewer-gate.md`
- Parent spine: `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md`
- Current checkout touchpoints named by the spine: `app/api/auth/session/route.ts`, `lib/auth/session.ts`, `types/db.ts`, `migrations/001_initial_schema.sql`, `migrations/004_donations.sql`, `lib/db/events.ts`, `lib/db/donations.ts`, `lib/db/tenants.ts`

## Deterministic Lint

Command:

```sh
UV_CACHE_DIR=.uv-cache uv run .agents/skills/bmad-architecture/scripts/lint_spine.py --workspace _bmad-output/planning-artifacts/architecture/architecture-templeOS-logic-update-2026-07-18
```

Result: pass. No duplicate AD IDs, missing AD fields, placeholders, or unpinned Stack findings were reported.

## Findings

### High - Tenant capability freshness is undecided

AD-3 loads active role codes into the tenant session, AD-5 makes route code check capabilities from role definitions, and AD-6 says tenant APIs derive identity from the tenant session. Unlike AD-4 for super-admins, no tenant rule says whether privileged tenant routes must re-read the active membership and roles before writes, or whether the signed cookie's embedded `roles` are authoritative until expiry.

That leaves a real divergence point for the level below. One implementer could cache roles in `templeos_tenant_session` for the full session lifetime; another could re-read membership state on every privileged mutation. Those choices produce different behavior after a tenant admin is deactivated or loses `members.manage`.

Recommended disposition: autofix the spine. Add a rule to AD-3, AD-5, or a new AD that tenant privileged writes re-read active `tenant_memberships` plus current role assignments/capabilities before mutation, while non-mutating layout/UI checks may use the session as a hint if the implementation wants that split.

### High - Tenant member management weakens the inherited canonical mutation path

The parent spine's AD-2 says `lib/provisioning/temples.ts` owns cross-table tenant/person/membership/role/WhatsApp mutations and includes `assignTenantMemberRoles` in that canonical service surface. This spine inherits that rule, but AD-7 describes tenant member management as routes that create/reuse a person, create/reactivate membership, and assign roles, while the Structural Seed places `members` routes beside repository modules and does not bind them back to the canonical provisioning service.

That can let one builder implement member management as direct route-to-repository sequences, while another routes through the inherited canonical service. The difference matters because person creation, membership activation, role assignment, and audit writes must stay transactionally consistent.

Recommended disposition: autofix the spine. Amend AD-7 or AD-10/AD-11 to state that tenant member and role mutations call the same canonical service boundary used by provisioning, or explicitly carve out a second named tenant-member service with the same transaction and audit guarantees. Do not leave route handlers free to orchestrate the multi-table sequence themselves.

### Medium - Host resolution's deployed trust boundary is under-specified

AD-2 correctly requires tenant login to resolve `req.headers.host` through `tenant_domains.hostname`, and the parent AD-19 says hostnames are full normalized hosts without scheme/path/port. The remaining gap is operational: the spine does not decide how host resolution behaves behind the actual deployment layer, including whether `Host` or `X-Forwarded-Host` is trusted, how ports are stripped in local development, how preview domains behave, and where the production-only ban on dev overrides is enforced.

This is exactly the kind of environmental envelope the reviewer checklist calls out. Independent implementers could normalize different header values and either reject valid tenant logins or accept spoofed tenant context depending on proxy behavior.

Recommended disposition: discuss or autofix. Add a concise host-resolution invariant: one helper owns trusted-host extraction, normalization, reserved apex rejection, port stripping, preview/local override handling, and production override blocking. The spine does not need deployment detail, but it should prevent route-level host parsing.

### Medium - Authored-record schema migration boundary is only conceptual

AD-8 says current author fields are conceptually renamed to `created_by_membership_id` and `recorded_by_membership_id`, and that new tenant-authored records reference `tenant_membership_id`. The current schema and types still expose `events.created_by` and `donations.recorded_by` as `admin_users` references. Because this is a clean reset, compatibility is not required, but the spine does not explicitly bind the forward schema/types/repositories as the owner of the physical rename and FK target.

Two implementers could interpret this differently: one could perform a physical schema/type rename with membership FKs, while another could keep existing column names and only change the value stored in them. That would create drift between API payloads, repository names, and database constraints.

Recommended disposition: autofix. Change AD-8 from "conceptually" to a physical forward-schema rule: `events.created_by_membership_id` and `donations.recorded_by_membership_id` are nullable FKs to `tenant_memberships(id)`, with matching TypeScript and repository field names. If existing JSON response names intentionally stay `createdBy` and `recordedBy`, say that as an API compatibility choice.

## Checklist Walk

- Real divergence points fixed: mostly yes, with gaps above for tenant session freshness, canonical mutation routing, host trust/normalization, and physical authored-record schema ownership.
- AD Rules enforceable and prevent stated divergences: mostly yes. AD-7 and AD-8 need sharper enforceability.
- Deferred items safe: yes. The Deferred table does not appear to defer anything required for the V0 logic refactor to converge.
- Named tech verified-current: not materially applicable in this child spine beyond inherited brownfield technologies; the lint pass found no Stack version issues.
- Brownfield ratification: mostly yes. It accurately identifies the current `admin_users`, `templeos_session`, `getPilotTenant()`, `events.created_by`, and `donations.recorded_by` breakpoints.
- Spec/source coverage: sufficient for the named logic-update scope, assuming the parent super-admin spine remains binding.
- Parent inheritance: mostly respected, but AD-7 needs an explicit tie back to inherited AD-2 so it does not weaken the canonical provisioning/mutation boundary.
- Altitude dimensions: application logic, identity, authorization, data ownership, and audit are covered. The operational/environmental host-resolution envelope is the main silent dimension.
