# export-menu.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/export/export-menu.tsx` |
| Layer | Export |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Feature Component in the **Export** area. It calls an external api, returns an http response.

Public symbols: `ExportMenu`.

## Actions Performed

- Calls an external API
- Returns an HTTP response

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next-intl`, `lucide-react`, `@/lib/export/types`, `@/lib/export/download-client`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/tabs`.
- Outputs: exports `ExportMenu`.

## Dependencies

- Internal imports: `lib/export/types.ts`, `lib/export/download-client.ts`, `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/tabs.tsx`
- External imports: `react`, `next-intl`, `lucide-react`

## Database Usage

- Tables referenced: `events`, `devotees`, `donations`, `campaigns`
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

- File size: 161 lines; 5 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/campaigns/campaigns-table.tsx`, `features/devotees/devotees-table.tsx`, `features/donations/donations-table.tsx`, `features/events/events-table.tsx`, `features/users/users-table.tsx`
- Imports: `lib/export/types.ts`, `lib/export/download-client.ts`, `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/tabs.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Safe** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/export/export-menu.tsx → lib/export/types.ts / lib/export/download-client.ts / components/ui/button.tsx / components/ui/dialog.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
