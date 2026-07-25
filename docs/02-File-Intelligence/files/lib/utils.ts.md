# utils.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/utils.ts` |
| Layer | lib |
| Category | Service/Utility |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Service/Utility in the **lib** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `cn`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `clsx`, `tailwind-merge`.
- Outputs: exports `cn`.

## Dependencies

- Internal imports: None detected
- External imports: `clsx`, `tailwind-merge`

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

- File size: 7 lines; 0 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `components/empty-state.tsx`, `components/floating-action-button.tsx`, `components/legal/legal-section.tsx`, `components/legal/table-of-contents.tsx`, `components/mobile-list-row.tsx`, `components/pagination-controls.tsx`, `components/responsive-search-bar.tsx`, `components/sortable-table-head.tsx`, `components/sticky-toolbar.tsx`, `components/table-shell.tsx`, `components/ui/alert-dialog.tsx`, `components/ui/alert.tsx`, `components/ui/avatar.tsx`, `components/ui/badge.tsx`, `components/ui/breadcrumb.tsx`, `components/ui/button.tsx`, `components/ui/calendar.tsx`, `components/ui/card.tsx`, `components/ui/checkbox.tsx`, `components/ui/dialog.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/labeled-input.tsx`, `components/ui/popover.tsx`, `components/ui/progress.tsx`, `components/ui/scroll-area.tsx`, `components/ui/select.tsx`, `components/ui/separator.tsx`, `components/ui/sheet.tsx`, `components/ui/sidebar.tsx`, `components/ui/skeleton.tsx`, `components/ui/switch.tsx`, `components/ui/table.tsx`, `components/ui/tabs.tsx`, `components/ui/textarea.tsx`, `components/ui/tooltip.tsx`, `features/auth/country-code-select.tsx`, `features/chatbot-settings/settings-section.tsx`, `features/chatbot-settings/seva-form-dialog.tsx`, `features/dashboard/app-sidebar.tsx`, `features/dashboard/bottom-nav-bar.tsx`, `features/dashboard/metric-card.tsx`, `features/devotees/devotee-import-wizard.tsx`, `features/super-admin/new-temple-form.tsx`, `features/super-admin/super-admin-bottom-nav-bar.tsx`, `features/super-admin/super-admin-sidebar.tsx`, `features/users/user-import-wizard.tsx`
- Imports: No internal modules

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

`Runtime/framework → lib/utils.ts → output or side effect`

## Cross References

- [File Intelligence Index](../../README.md)
- [API Catalog](../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../06-Reference/Database-Catalog.md)
