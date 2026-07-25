# campaigns-table.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/campaigns/campaigns-table.tsx` |
| Layer | Campaigns |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Campaigns** area. It reads database, deletes records, calls an external api.

Public symbols: `CampaignsTable`.

## Actions Performed

- Reads database
- Deletes records
- Calls an external API

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/link`, `next/navigation`, `next-intl`, `framer-motion`, `lucide-react`, `@/types/db`, `@/components/ui/button`, `@/components/ui/badge`, `@/components/ui/checkbox`, `@/components/ui/label`, `@/components/ui/select`, `@/components/ui/table`, `@/components/table-shell`, `@/components/empty-state`, `@/components/sortable-table-head`, `@/components/pagination-controls`, `@/components/page-header`, `@/components/responsive-search-bar`, `@/components/filter-bottom-sheet`, `@/components/overflow-action-menu`, `@/components/mobile-list-view`, `@/components/mobile-list-row`, `@/features/export/export-menu`, `@/lib/date`, `@/lib/motion`, `@/lib/url-params`, `./campaign-form-dialog`.
- Outputs: exports `CampaignsTable`.

## Dependencies

- Internal imports: `types/db.ts`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/checkbox.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/empty-state.tsx`, `components/sortable-table-head.tsx`, `components/pagination-controls.tsx`, `components/page-header.tsx`, `components/responsive-search-bar.tsx`, `components/filter-bottom-sheet.tsx`, `components/overflow-action-menu.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `features/export/export-menu.tsx`, `lib/date.ts`, `lib/motion.ts`, `lib/url-params.ts`, `features/campaigns/campaign-form-dialog.tsx`
- External imports: `react`, `next/link`, `next/navigation`, `next-intl`, `framer-motion`, `lucide-react`

## Database Usage

- Tables referenced: `features`, `campaigns`
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

- File size: 430 lines; 22 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/campaigns/page.tsx`
- Imports: `types/db.ts`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/checkbox.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/empty-state.tsx`, `components/sortable-table-head.tsx`, `components/pagination-controls.tsx`, `components/page-header.tsx`, `components/responsive-search-bar.tsx`, `components/filter-bottom-sheet.tsx`, `components/overflow-action-menu.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `features/export/export-menu.tsx`, `lib/date.ts`, `lib/motion.ts`, `lib/url-params.ts`, `features/campaigns/campaign-form-dialog.tsx`

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

`Runtime/framework → features/campaigns/campaigns-table.tsx → types/db.ts / components/ui/button.tsx / components/ui/badge.tsx / components/ui/checkbox.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
