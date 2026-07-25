# role-definitions.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/role-definitions.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records.

Public symbols: `V0RoleDefinitionSeed`, `V0_ROLE_DEFINITIONS`, `listRoleDefinitionsForSuperAdmin`, `listActiveRoleCodesForSuperAdmin`, `seedV0RoleDefinitions`.

## Actions Performed

- Reads database
- Creates records
- Updates records

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./pool`, `./query-client`, `@/types/db`.
- Outputs: exports `V0RoleDefinitionSeed`, `V0_ROLE_DEFINITIONS`, `listRoleDefinitionsForSuperAdmin`, `listActiveRoleCodesForSuperAdmin`, `seedV0RoleDefinitions`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `role_definitions`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 209 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(super-admin)/super-admin/(shell)/roles/page.tsx`, `app/(super-admin)/super-admin/(shell)/temples/[tenantId]/page.tsx`, `app/api/super-admin/roles/route.test.ts`, `app/api/super-admin/roles/route.ts`, `lib/db/role-definitions.test.ts`, `lib/provisioning/temples.test.ts`, `lib/provisioning/temples.ts`, `lib/provisioning/tenant-members.ts`, `scripts/seed.mts`
- Imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Medium** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 9 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/db/role-definitions.ts → lib/db/pool.ts / lib/db/query-client.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
