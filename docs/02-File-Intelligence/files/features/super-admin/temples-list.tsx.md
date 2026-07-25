# temples-list.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/super-admin/temples-list.tsx` |
| Layer | Super Admin |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **High** |

## Purpose and Responsibilities

Feature Component in the **Super Admin** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `TemplesList`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/link`, `lucide-react`, `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/table`, `@/components/table-shell`, `@/components/mobile-list-view`, `@/components/mobile-list-row`, `@/components/pagination-controls`, `@/lib/pagination`, `@/lib/db/tenants`.
- Outputs: exports `TemplesList`.

## Dependencies

- Internal imports: `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `components/pagination-controls.tsx`, `lib/pagination.ts`, `lib/db/tenants.ts`
- External imports: `react`, `next/link`, `lucide-react`

## Database Usage

- Tables referenced: `tenants`
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

- File size: 118 lines; 9 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(super-admin)/super-admin/(shell)/temples/page.tsx`
- Imports: `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `components/pagination-controls.tsx`, `lib/pagination.ts`, `lib/db/tenants.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **High** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/super-admin/temples-list.tsx → components/ui/badge.tsx / components/ui/button.tsx / components/ui/table.tsx / components/table-shell.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
