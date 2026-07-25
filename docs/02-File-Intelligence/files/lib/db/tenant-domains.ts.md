# tenant-domains.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/tenant-domains.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Critical** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records.

Public symbols: `createTenantDomainForSuperAdmin`, `getActiveTenantDomainByHostname`.

## Actions Performed

- Reads database
- Creates records

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./pool`, `./query-client`, `@/lib/tenant-domains`, `@/types/db`.
- Outputs: exports `createTenantDomainForSuperAdmin`, `getActiveTenantDomainByHostname`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `lib/tenant-domains.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `tenant_domains`
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

- File size: 54 lines; 4 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/auth/session/route.test.ts`, `app/api/auth/session/route.ts`, `app/api/auth/tenant-context/route.test.ts`, `app/api/auth/tenant-context/route.ts`, `lib/db/tenant-domains.test.ts`, `lib/provisioning/temples.test.ts`, `lib/provisioning/temples.ts`
- Imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `lib/tenant-domains.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Critical** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 9 | 9 | 9 | 9 | 6 | 9 | 8 | 9 | 9 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/db/tenant-domains.ts → lib/db/pool.ts / lib/db/query-client.ts / lib/tenant-domains.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
