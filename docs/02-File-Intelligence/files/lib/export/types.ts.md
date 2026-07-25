# types.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/export/types.ts` |
| Layer | Export |
| Category | Export Service |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Export Service in the **Export** area. It returns an http response.

Public symbols: `ColumnDef`, `ExportMeta`, `ExportFormat`, `ExportFile`.

## Actions Performed

- Returns an HTTP response

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: file-local constants or runtime/framework inputs.
- Outputs: exports `ColumnDef`, `ExportMeta`, `ExportFormat`, `ExportFile`.

## Dependencies

- Internal imports: None detected
- External imports: None detected

## Database Usage

- Tables referenced: `devotees`
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

- File size: 32 lines; 0 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/export/export-menu.tsx`, `lib/export/columns/campaigns.ts`, `lib/export/columns/devotees.ts`, `lib/export/columns/donations.ts`, `lib/export/columns/events.ts`, `lib/export/columns/users.ts`, `lib/export/columns/whatsapp-thread.ts`, `lib/export/index.test.ts`, `lib/export/index.ts`, `lib/export/pdf.test.ts`, `lib/export/pdf.ts`, `lib/export/response.ts`, `lib/export/workbook.test.ts`, `lib/export/workbook.ts`
- Imports: No internal modules

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

`Runtime/framework → lib/export/types.ts → output or side effect`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
