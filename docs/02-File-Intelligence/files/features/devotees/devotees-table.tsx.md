# devotees-table.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/devotees/devotees-table.tsx` |
| Layer | Devotees |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Devotees** area. It reads database, deletes records, calls an external api, uploads/processes media.

Public symbols: `DevoteesTable`.

## Actions Performed

- Reads database
- Deletes records
- Calls an external API
- Uploads/processes media

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/navigation`, `next-intl`, `next/link`, `framer-motion`, `lucide-react`, `@/types/db`, `@/components/ui/button`, `@/components/ui/badge`, `@/components/ui/checkbox`, `@/components/ui/avatar`, `@/components/ui/select`, `@/components/ui/label`, `@/components/ui/alert-dialog`, `@/components/ui/table`, `@/components/table-shell`, `@/components/empty-state`, `@/components/sortable-table-head`, `@/components/pagination-controls`, `@/components/page-header`, `@/features/export/export-menu`, `@/components/overflow-action-menu`, `@/components/filter-bottom-sheet`, `@/components/responsive-search-bar`, `@/components/sticky-toolbar`, `@/components/mobile-list-view`, `@/components/mobile-list-row`, `@/lib/date`, `@/lib/phone.mts`, `@/lib/motion`, `@/lib/url-params`, `./devotee-form-dialog`.
- Outputs: exports `DevoteesTable`.

## Dependencies

- Internal imports: `types/db.ts`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/checkbox.tsx`, `components/ui/avatar.tsx`, `components/ui/select.tsx`, `components/ui/label.tsx`, `components/ui/alert-dialog.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/empty-state.tsx`, `components/sortable-table-head.tsx`, `components/pagination-controls.tsx`, `components/page-header.tsx`, `features/export/export-menu.tsx`, `components/overflow-action-menu.tsx`, `components/filter-bottom-sheet.tsx`, `components/responsive-search-bar.tsx`, `components/sticky-toolbar.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `lib/date.ts`, `lib/phone.mts`, `lib/motion.ts`, `lib/url-params.ts`, `features/devotees/devotee-form-dialog.tsx`
- External imports: `react`, `next/navigation`, `next-intl`, `next/link`, `framer-motion`, `lucide-react`

## Database Usage

- Tables referenced: `devotees`, `features`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 609 lines; 26 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/devotees/page.tsx`
- Imports: `types/db.ts`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/checkbox.tsx`, `components/ui/avatar.tsx`, `components/ui/select.tsx`, `components/ui/label.tsx`, `components/ui/alert-dialog.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/empty-state.tsx`, `components/sortable-table-head.tsx`, `components/pagination-controls.tsx`, `components/page-header.tsx`, `features/export/export-menu.tsx`, `components/overflow-action-menu.tsx`, `components/filter-bottom-sheet.tsx`, `components/responsive-search-bar.tsx`, `components/sticky-toolbar.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `lib/date.ts`, `lib/phone.mts`, `lib/motion.ts`, `lib/url-params.ts`, `features/devotees/devotee-form-dialog.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 7 | 6 | 7 | 7 | 7 | 7 | 8 | 7 | 7 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/devotees/devotees-table.tsx → types/db.ts / components/ui/button.tsx / components/ui/badge.tsx / components/ui/checkbox.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
