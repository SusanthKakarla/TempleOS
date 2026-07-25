# super-admin-topbar.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/super-admin/super-admin-topbar.tsx` |
| Layer | Super Admin |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Feature Component in the **Super Admin** area. It deletes records, calls an external api.

Public symbols: `SuperAdminTopbar`.

## Actions Performed

- Deletes records
- Calls an external API

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/navigation`, `lucide-react`, `@/components/ui/sidebar`, `@/components/ui/separator`, `@/components/ui/breadcrumb`, `@/components/ui/avatar`, `@/components/ui/dropdown-menu`, `@/components/theme-toggle`, `./super-admin-sidebar`.
- Outputs: exports `SuperAdminTopbar`.

## Dependencies

- Internal imports: `components/ui/sidebar.tsx`, `components/ui/separator.tsx`, `components/ui/breadcrumb.tsx`, `components/ui/avatar.tsx`, `components/ui/dropdown-menu.tsx`, `components/theme-toggle.tsx`, `features/super-admin/super-admin-sidebar.tsx`
- External imports: `react`, `next/navigation`, `lucide-react`

## Database Usage

- Tables referenced: None detected
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 104 lines; 7 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/super-admin/super-admin-shell.tsx`
- Imports: `components/ui/sidebar.tsx`, `components/ui/separator.tsx`, `components/ui/breadcrumb.tsx`, `components/ui/avatar.tsx`, `components/ui/dropdown-menu.tsx`, `components/theme-toggle.tsx`, `features/super-admin/super-admin-sidebar.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Medium** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/super-admin/super-admin-topbar.tsx → components/ui/sidebar.tsx / components/ui/separator.tsx / components/ui/breadcrumb.tsx / components/ui/avatar.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
