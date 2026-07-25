# index.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/export/index.ts` |
| Layer | Export |
| Category | Export Service |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Export Service in the **Export** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `buildExportFile`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./workbook`, `./pdf`, `./types`.
- Outputs: exports `buildExportFile`.

## Dependencies

- Internal imports: `lib/export/workbook.ts`, `lib/export/pdf.ts`, `lib/export/types.ts`
- External imports: None detected

## Database Usage

- Tables referenced: None detected
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

- File size: 35 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/campaigns/export/route.ts`, `app/api/devotees/export/route.ts`, `app/api/devotees/import/template/route.ts`, `app/api/donations/export/route.ts`, `app/api/events/export/route.ts`, `app/api/users/export/route.ts`, `app/api/users/import/template/route.ts`, `lib/export/index.test.ts`
- Imports: `lib/export/workbook.ts`, `lib/export/pdf.ts`, `lib/export/types.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Safe** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 9 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/export/index.ts → lib/export/workbook.ts / lib/export/pdf.ts / lib/export/types.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
