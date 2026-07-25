# motion.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/motion.ts` |
| Layer | lib |
| Category | Service/Utility |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Service/Utility in the **lib** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `springSnappy`, `springSoft`, `fadeInUp`, `rowFadeIn`, `staggerContainer`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `framer-motion`.
- Outputs: exports `springSnappy`, `springSoft`, `fadeInUp`, `rowFadeIn`, `staggerContainer`.

## Dependencies

- Internal imports: None detected
- External imports: `framer-motion`

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

- File size: 22 lines; 0 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/template.tsx`, `components/fade-in.tsx`, `features/auth/tenant-login-form.tsx`, `features/campaigns/campaigns-table.tsx`, `features/dashboard/app-sidebar.tsx`, `features/dashboard/metric-card.tsx`, `features/devotees/devotees-table.tsx`, `features/donations/devotee-donations-card.tsx`, `features/donations/donations-table.tsx`, `features/events/announce-dialog.tsx`, `features/events/event-card.tsx`, `features/events/events-table.tsx`, `features/super-admin/new-temple-form.tsx`, `features/super-admin/super-admin-login-form.tsx`, `features/super-admin/super-admin-sidebar.tsx`, `features/users/users-table.tsx`
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

`Runtime/framework → lib/motion.ts → output or side effect`

## Cross References

- [File Intelligence Index](../../README.md)
- [API Catalog](../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../06-Reference/Database-Catalog.md)
