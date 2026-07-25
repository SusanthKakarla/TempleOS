# route.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `app/api/campaigns/[id]/route.ts` |
| Layer | API |
| Category | API Route |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

API Route in the **API** area. It deletes records, processes notifications/messages, returns an http response.

Public symbols: `GET`, `PATCH`, `DELETE`.

## Actions Performed

- Deletes records
- Processes notifications/messages
- Returns an HTTP response

## Execution

- Trigger: HTTP request
- HTTP methods: GET, PATCH, DELETE

## Inputs and Outputs

- Inputs: imports from `next/server`, `@/lib/auth/tenant-admin`, `@/lib/auth/features`, `@/lib/db/campaigns`, `@/lib/validation/campaigns`, `@/types/db`.
- Outputs: exports `GET`, `PATCH`, `DELETE`.

## Dependencies

- Internal imports: `lib/auth/tenant-admin.ts`, `lib/auth/features.ts`, `lib/db/campaigns.ts`, `lib/validation/campaigns.ts`, `types/db.ts`
- External imports: `next/server`

## Database Usage

- Tables referenced: `features`, `campaigns`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: GET, PATCH, DELETE
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: Runtime/schema validation detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 71 lines; 5 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `lib/auth/tenant-admin.ts`, `lib/auth/features.ts`, `lib/db/campaigns.ts`, `lib/validation/campaigns.ts`, `types/db.ts`

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

`Runtime/framework → app/api/campaigns/[id]/route.ts → lib/auth/tenant-admin.ts / lib/auth/features.ts / lib/db/campaigns.ts / lib/validation/campaigns.ts`

## Cross References

- [File Intelligence Index](../../../../../README.md)
- [API Catalog](../../../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../../../06-Reference/Database-Catalog.md)
