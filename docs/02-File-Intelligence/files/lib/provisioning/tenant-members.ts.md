# tenant-members.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/provisioning/tenant-members.ts` |
| Layer | lib |
| Category | Service/Utility |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **High** |

## Purpose and Responsibilities

Service/Utility in the **lib** area. It reads database, deletes records.

Public symbols: `TenantAdminActor`, `TenantMemberValidationIssue`, `TenantMemberActionError`, `InviteTenantMemberInput`, `InviteTenantMemberValidationResult`, `parseInviteTenantMemberInput`, `inviteTenantMember`, `ChangeTenantMemberRolesInput`, `changeTenantMemberRoles`, `SetTenantMemberStatusInput`, `setTenantMemberStatus`, `UpdateTenantMemberDetailsInput`, `updateTenantMemberDetails`, `DeleteTenantMemberInput`, `deleteTenantMember`.

## Actions Performed

- Reads database
- Deletes records

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `zod`, `@/lib/db/audit-log`, `@/lib/db/pool`, `@/lib/db/query-client`, `@/lib/db/role-definitions`, `@/lib/db/tenant-memberships`, `@/lib/db/persons`, `@/lib/phone.mts`, `@/types/db`.
- Outputs: exports `TenantAdminActor`, `TenantMemberValidationIssue`, `TenantMemberActionError`, `InviteTenantMemberInput`, `InviteTenantMemberValidationResult`, `parseInviteTenantMemberInput`, `inviteTenantMember`, `ChangeTenantMemberRolesInput`, `changeTenantMemberRoles`, `SetTenantMemberStatusInput`, `setTenantMemberStatus`, `UpdateTenantMemberDetailsInput`, `updateTenantMemberDetails`, `DeleteTenantMemberInput`, `deleteTenantMember`.

## Dependencies

- Internal imports: `lib/db/audit-log.ts`, `lib/db/pool.ts`, `lib/db/query-client.ts`, `lib/db/role-definitions.ts`, `lib/db/tenant-memberships.ts`, `lib/db/persons.ts`, `lib/phone.mts`, `types/db.ts`
- External imports: `zod`

## Database Usage

- Tables referenced: `persons`, `role_definitions`, `tenant_memberships`, `tenant_membership_roles`, `events`, `donations`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: Runtime/schema validation detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 482 lines; 8 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/users/[membershipId]/roles/route.ts`, `app/api/users/[membershipId]/route.ts`, `app/api/users/[membershipId]/status/route.ts`, `app/api/users/import/commit/route.ts`, `app/api/users/route.ts`
- Imports: `lib/db/audit-log.ts`, `lib/db/pool.ts`, `lib/db/query-client.ts`, `lib/db/role-definitions.ts`, `lib/db/tenant-memberships.ts`, `lib/db/persons.ts`, `lib/phone.mts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **High** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 9 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/provisioning/tenant-members.ts → lib/db/audit-log.ts / lib/db/pool.ts / lib/db/query-client.ts / lib/db/role-definitions.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
