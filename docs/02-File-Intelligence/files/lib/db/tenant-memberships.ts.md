# tenant-memberships.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/tenant-memberships.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Critical** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, deletes records.

Public symbols: `TenantMembershipWithRoles`, `findActiveTenantMembershipByPersonAndTenant`, `getTenantMembershipById`, `getTenantMembershipByTenantAndIdForSuperAdmin`, `createTenantMembershipForProvisioning`, `assignTenantMembershipRolesForProvisioning`, `replaceTenantMembershipRolesForSuperAdmin`, `updateTenantMembershipLocale`, `UpdateTenantMembershipDetailsInput`, `updateTenantMembershipDetails`, `deleteTenantMembership`, `TenantMembershipListItem`, `ListTenantMembershipsFilters`, `listTenantMembershipsForTenant`, `countTenantMembershipsFiltered`, `listTenantMembershipsByIds`, `listActiveMemberPhonesForTenant`, `touchLastSignedIn`, `deactivateTenantMembership`, `reactivateTenantMembership`, `replaceTenantMembershipRoles`.

## Actions Performed

- Reads database
- Creates records
- Updates records
- Deletes records

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `./pool`, `./query-client`, `@/types/db`, `@/lib/pagination`.
- Outputs: exports `TenantMembershipWithRoles`, `findActiveTenantMembershipByPersonAndTenant`, `getTenantMembershipById`, `getTenantMembershipByTenantAndIdForSuperAdmin`, `createTenantMembershipForProvisioning`, `assignTenantMembershipRolesForProvisioning`, `replaceTenantMembershipRolesForSuperAdmin`, `updateTenantMembershipLocale`, `UpdateTenantMembershipDetailsInput`, `updateTenantMembershipDetails`, `deleteTenantMembership`, `TenantMembershipListItem`, `ListTenantMembershipsFilters`, `listTenantMembershipsForTenant`, `countTenantMembershipsFiltered`, `listTenantMembershipsByIds`, `listActiveMemberPhonesForTenant`, `touchLastSignedIn`, `deactivateTenantMembership`, `reactivateTenantMembership`, `replaceTenantMembershipRoles`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `types/db.ts`, `lib/pagination.ts`
- External imports: `react`

## Database Usage

- Tables referenced: `persons`, `role_definitions`, `tenant_memberships`, `tenant_membership_roles`, `events`, `donations`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 463 lines; 4 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/users/activity/page.tsx`, `app/(dashboard)/dashboard/users/page.tsx`, `app/api/account/locale/route.ts`, `app/api/auth/session/route.test.ts`, `app/api/auth/session/route.ts`, `app/api/cron/daily-birthday-check/route.ts`, `app/api/devotees/route.ts`, `app/api/identity-session-isolation.test.ts`, `app/api/super-admin/temples/[tenantId]/features/route.ts`, `app/api/super-admin/temples/[tenantId]/route.ts`, `app/api/super-admin/temples/[tenantId]/status/route.ts`, `app/api/users/export/route.ts`, `app/api/users/import/commit/route.ts`, `app/api/users/import/preview/route.ts`, `app/api/users/route.ts`, `features/super-admin/new-temple-form-helpers.ts`, `features/users/change-role-dialog.tsx`, `features/users/delete-user-dialog.tsx`, `features/users/edit-user-dialog.tsx`, `features/users/toggle-user-status-dialog.tsx`, `features/users/user-activity-panel.tsx`, `features/users/users-table.tsx`, `lib/auth/session-live.test.ts`, `lib/auth/session.ts`, `lib/db/tenant-memberships.test.ts`, `lib/export/columns/users.ts`, `lib/provisioning/temples.test.ts`, `lib/provisioning/temples.ts`, `lib/provisioning/tenant-members.ts`
- Imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `types/db.ts`, `lib/pagination.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Critical** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 9 | 8 | 9 | 9 | 6 | 9 | 8 | 9 | 9 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/db/tenant-memberships.ts → lib/db/pool.ts / lib/db/query-client.ts / types/db.ts / lib/pagination.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
