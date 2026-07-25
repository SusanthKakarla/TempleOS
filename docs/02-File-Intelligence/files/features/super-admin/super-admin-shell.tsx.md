# super-admin-shell.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/super-admin/super-admin-shell.tsx` |
| Layer | Super Admin |
| Category | Feature Component |
| Runtime | React (server/client determined by parent) |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Feature Component in the **Super Admin** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `SuperAdminShell`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `@/types/db`, `@/components/ui/sidebar`, `@/features/dashboard/ambient-background`, `@/features/dashboard/motion-provider`, `./super-admin-sidebar`, `./super-admin-topbar`, `./super-admin-bottom-nav-bar`.
- Outputs: exports `SuperAdminShell`.

## Dependencies

- Internal imports: `types/db.ts`, `components/ui/sidebar.tsx`, `features/dashboard/ambient-background.tsx`, `features/dashboard/motion-provider.tsx`, `features/super-admin/super-admin-sidebar.tsx`, `features/super-admin/super-admin-topbar.tsx`, `features/super-admin/super-admin-bottom-nav-bar.tsx`
- External imports: None detected

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

- File size: 39 lines; 7 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(super-admin)/super-admin/(shell)/layout.tsx`
- Imports: `types/db.ts`, `components/ui/sidebar.tsx`, `features/dashboard/ambient-background.tsx`, `features/dashboard/motion-provider.tsx`, `features/super-admin/super-admin-sidebar.tsx`, `features/super-admin/super-admin-topbar.tsx`, `features/super-admin/super-admin-bottom-nav-bar.tsx`

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

`Runtime/framework → features/super-admin/super-admin-shell.tsx → types/db.ts / components/ui/sidebar.tsx / features/dashboard/ambient-background.tsx / features/dashboard/motion-provider.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
