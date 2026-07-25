# donations-table.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/donations/donations-table.tsx` |
| Layer | Donations |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Donations** area. It reads database, deletes records, calls an external api.

Public symbols: `DonationsTable`.

## Actions Performed

- Reads database
- Deletes records
- Calls an external API

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/navigation`, `next-intl`, `next/link`, `framer-motion`, `lucide-react`, `@/types/db`, `@/features/dashboard/metric-card`, `@/components/ui/button`, `@/components/ui/badge`, `@/components/ui/checkbox`, `@/components/ui/label`, `@/components/ui/select`, `@/components/ui/popover`, `@/components/ui/calendar`, `@/components/ui/table`, `@/components/table-shell`, `@/components/empty-state`, `@/components/sortable-table-head`, `@/components/pagination-controls`, `@/components/page-header`, `@/components/overflow-action-menu`, `@/components/filter-bottom-sheet`, `@/components/responsive-search-bar`, `@/lib/currency`, `@/lib/date`, `@/lib/motion`, `@/lib/url-params`, `@/features/export/export-menu`, `./donation-options`, `./donation-form-dialog`.
- Outputs: exports `DonationsTable`.

## Dependencies

- Internal imports: `types/db.ts`, `features/dashboard/metric-card.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/checkbox.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/popover.tsx`, `components/ui/calendar.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/empty-state.tsx`, `components/sortable-table-head.tsx`, `components/pagination-controls.tsx`, `components/page-header.tsx`, `components/overflow-action-menu.tsx`, `components/filter-bottom-sheet.tsx`, `components/responsive-search-bar.tsx`, `lib/currency.ts`, `lib/date.ts`, `lib/motion.ts`, `lib/url-params.ts`, `features/export/export-menu.tsx`, `features/donations/donation-options.ts`, `features/donations/donation-form-dialog.tsx`
- External imports: `react`, `next/navigation`, `next-intl`, `next/link`, `framer-motion`, `lucide-react`

## Database Usage

- Tables referenced: `devotees`, `donations`, `features`
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

- File size: 496 lines; 25 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/donations/page.tsx`
- Imports: `types/db.ts`, `features/dashboard/metric-card.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/checkbox.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/popover.tsx`, `components/ui/calendar.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/empty-state.tsx`, `components/sortable-table-head.tsx`, `components/pagination-controls.tsx`, `components/page-header.tsx`, `components/overflow-action-menu.tsx`, `components/filter-bottom-sheet.tsx`, `components/responsive-search-bar.tsx`, `lib/currency.ts`, `lib/date.ts`, `lib/motion.ts`, `lib/url-params.ts`, `features/export/export-menu.tsx`, `features/donations/donation-options.ts`, `features/donations/donation-form-dialog.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 9 | 8 | 9 | 9 | 9 | 7 | 8 | 7 | 9 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/donations/donations-table.tsx → types/db.ts / features/dashboard/metric-card.tsx / components/ui/button.tsx / components/ui/badge.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
