# page.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `app/(dashboard)/dashboard/page.tsx` |
| Layer | Presentation |
| Category | Page |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Page in the **Presentation** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `DashboardHomePage`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: Server rendering and page navigation
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `lucide-react`, `next-intl/server`, `./require-dashboard-admin`, `@/lib/db/tenants`, `@/lib/db/events`, `@/lib/db/devotees`, `@/lib/db/donations`, `@/features/dashboard/metric-card`, `@/components/page-header`, `@/lib/dashboard-timeseries`, `@/features/dashboard/donations-chart`.
- Outputs: exports `DashboardHomePage`.

## Dependencies

- Internal imports: `app/(dashboard)/dashboard/require-dashboard-admin.ts`, `lib/db/tenants.ts`, `lib/db/events.ts`, `lib/db/devotees.ts`, `lib/db/donations.ts`, `features/dashboard/metric-card.tsx`, `components/page-header.tsx`, `lib/dashboard-timeseries.ts`, `features/dashboard/donations-chart.tsx`
- External imports: `lucide-react`, `next-intl/server`

## Database Usage

- Tables referenced: `tenants`, `events`, `devotees`, `donations`, `features`
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

- File size: 80 lines; 9 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `app/(dashboard)/dashboard/require-dashboard-admin.ts`, `lib/db/tenants.ts`, `lib/db/events.ts`, `lib/db/devotees.ts`, `lib/db/donations.ts`, `features/dashboard/metric-card.tsx`, `components/page-header.tsx`, `lib/dashboard-timeseries.ts`, `features/dashboard/donations-chart.tsx`

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

`Runtime/framework → app/(dashboard)/dashboard/page.tsx → app/(dashboard)/dashboard/require-dashboard-admin.ts / lib/db/tenants.ts / lib/db/events.ts / lib/db/devotees.ts`

## Cross References

- [File Intelligence Index](../../../../README.md)
- [API Catalog](../../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../../06-Reference/Database-Catalog.md)
