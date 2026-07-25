# dashboard-shell.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/dashboard/dashboard-shell.tsx` |
| Layer | Dashboard |
| Category | Feature Component |
| Runtime | React (server/client determined by parent) |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Dashboard** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `DashboardShell`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `@/lib/auth/session`, `@/lib/db/tenant-features`, `@/lib/db/tenants`, `@/components/ui/sidebar`, `./app-sidebar`, `./ambient-background`, `./dashboard-topbar`, `./bottom-nav-bar`, `./motion-provider`.
- Outputs: exports `DashboardShell`.

## Dependencies

- Internal imports: `lib/auth/session.ts`, `lib/db/tenant-features.ts`, `lib/db/tenants.ts`, `components/ui/sidebar.tsx`, `features/dashboard/app-sidebar.tsx`, `features/dashboard/ambient-background.tsx`, `features/dashboard/dashboard-topbar.tsx`, `features/dashboard/bottom-nav-bar.tsx`, `features/dashboard/motion-provider.tsx`
- External imports: None detected

## Database Usage

- Tables referenced: `tenants`, `features`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 47 lines; 9 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/layout.tsx`
- Imports: `lib/auth/session.ts`, `lib/db/tenant-features.ts`, `lib/db/tenants.ts`, `components/ui/sidebar.tsx`, `features/dashboard/app-sidebar.tsx`, `features/dashboard/ambient-background.tsx`, `features/dashboard/dashboard-topbar.tsx`, `features/dashboard/bottom-nav-bar.tsx`, `features/dashboard/motion-provider.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/dashboard/dashboard-shell.tsx → lib/auth/session.ts / lib/db/tenant-features.ts / lib/db/tenants.ts / components/ui/sidebar.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
