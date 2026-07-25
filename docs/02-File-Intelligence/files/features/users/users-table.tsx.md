# users-table.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/users/users-table.tsx` |
| Layer | Users |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Users** area. It reads database, deletes records, uploads/processes media.

Public symbols: `UsersTable`.

## Actions Performed

- Reads database
- Deletes records
- Uploads/processes media

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/navigation`, `next-intl`, `next/link`, `framer-motion`, `lucide-react`, `@/lib/db/tenant-memberships`, `@/types/db`, `@/components/ui/button`, `@/components/ui/badge`, `@/components/ui/checkbox`, `@/components/ui/avatar`, `@/components/ui/label`, `@/components/ui/select`, `@/components/ui/table`, `@/components/table-shell`, `@/components/empty-state`, `@/components/sortable-table-head`, `@/components/pagination-controls`, `@/components/page-header`, `@/features/export/export-menu`, `@/components/overflow-action-menu`, `@/components/filter-bottom-sheet`, `@/components/responsive-search-bar`, `@/components/sticky-toolbar`, `@/components/mobile-list-view`, `@/components/mobile-list-row`, `@/lib/date`, `@/lib/motion`, `@/lib/url-params`, `./invite-user-dialog`, `./change-role-dialog`, `./toggle-user-status-dialog`, `./user-activity-panel`, `./edit-user-dialog`, `./delete-user-dialog`.
- Outputs: exports `UsersTable`.

## Dependencies

- Internal imports: `lib/db/tenant-memberships.ts`, `types/db.ts`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/checkbox.tsx`, `components/ui/avatar.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/empty-state.tsx`, `components/sortable-table-head.tsx`, `components/pagination-controls.tsx`, `components/page-header.tsx`, `features/export/export-menu.tsx`, `components/overflow-action-menu.tsx`, `components/filter-bottom-sheet.tsx`, `components/responsive-search-bar.tsx`, `components/sticky-toolbar.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `lib/date.ts`, `lib/motion.ts`, `lib/url-params.ts`, `features/users/invite-user-dialog.tsx`, `features/users/change-role-dialog.tsx`, `features/users/toggle-user-status-dialog.tsx`, `features/users/user-activity-panel.tsx`, `features/users/edit-user-dialog.tsx`, `features/users/delete-user-dialog.tsx`
- External imports: `react`, `next/navigation`, `next-intl`, `next/link`, `framer-motion`, `lucide-react`

## Database Usage

- Tables referenced: `features`
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

- File size: 503 lines; 30 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/users/page.tsx`
- Imports: `lib/db/tenant-memberships.ts`, `types/db.ts`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/checkbox.tsx`, `components/ui/avatar.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/empty-state.tsx`, `components/sortable-table-head.tsx`, `components/pagination-controls.tsx`, `components/page-header.tsx`, `features/export/export-menu.tsx`, `components/overflow-action-menu.tsx`, `components/filter-bottom-sheet.tsx`, `components/responsive-search-bar.tsx`, `components/sticky-toolbar.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `lib/date.ts`, `lib/motion.ts`, `lib/url-params.ts`, `features/users/invite-user-dialog.tsx`, `features/users/change-role-dialog.tsx`, `features/users/toggle-user-status-dialog.tsx`, `features/users/user-activity-panel.tsx`, `features/users/edit-user-dialog.tsx`, `features/users/delete-user-dialog.tsx`

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

`Runtime/framework → features/users/users-table.tsx → lib/db/tenant-memberships.ts / types/db.ts / components/ui/button.tsx / components/ui/badge.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
