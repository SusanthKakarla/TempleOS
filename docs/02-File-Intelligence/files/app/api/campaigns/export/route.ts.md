# route.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `app/api/campaigns/export/route.ts` |
| Layer | API |
| Category | API Route |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

API Route in the **API** area. It reads database, returns an http response.

Public symbols: `GET`, `POST`.

## Actions Performed

- Reads database
- Returns an HTTP response

## Execution

- Trigger: HTTP request
- HTTP methods: GET, POST

## Inputs and Outputs

- Inputs: imports from `next/server`, `zod`, `@/lib/auth/tenant-admin`, `@/lib/auth/features`, `@/lib/db/tenants`, `@/lib/db/campaigns`, `@/lib/export`, `@/lib/export/response`, `@/lib/export/columns/campaigns`.
- Outputs: exports `GET`, `POST`.

## Dependencies

- Internal imports: `lib/auth/tenant-admin.ts`, `lib/auth/features.ts`, `lib/db/tenants.ts`, `lib/db/campaigns.ts`, `lib/export/index.ts`, `lib/export/response.ts`, `lib/export/columns/campaigns.ts`
- External imports: `next/server`, `zod`

## Database Usage

- Tables referenced: `tenants`, `features`, `campaigns`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: GET, POST
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: Runtime/schema validation detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 73 lines; 7 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `lib/auth/tenant-admin.ts`, `lib/auth/features.ts`, `lib/db/tenants.ts`, `lib/db/campaigns.ts`, `lib/export/index.ts`, `lib/export/response.ts`, `lib/export/columns/campaigns.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Safe** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → app/api/campaigns/export/route.ts → lib/auth/tenant-admin.ts / lib/auth/features.ts / lib/db/tenants.ts / lib/db/campaigns.ts`

## Cross References

- [File Intelligence Index](../../../../../README.md)
- [API Catalog](../../../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../../../06-Reference/Database-Catalog.md)
