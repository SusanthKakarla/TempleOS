# app-sidebar.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/dashboard/app-sidebar.tsx` |
| Layer | Dashboard |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Feature Component in the **Dashboard** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `NAV_ITEMS`, `AppSidebar`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/link`, `next/navigation`, `next-intl`, `framer-motion`, `lucide-react`, `@/components/ui/sidebar`, `@/lib/utils`, `@/lib/motion`.
- Outputs: exports `NAV_ITEMS`, `AppSidebar`.

## Dependencies

- Internal imports: `components/ui/sidebar.tsx`, `lib/utils.ts`, `lib/motion.ts`
- External imports: `next/link`, `next/navigation`, `next-intl`, `framer-motion`, `lucide-react`

## Database Usage

- Tables referenced: `events`, `devotees`, `donations`, `campaigns`
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

- File size: 151 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/dashboard/dashboard-shell.tsx`, `features/dashboard/dashboard-topbar.tsx`
- Imports: `components/ui/sidebar.tsx`, `lib/utils.ts`, `lib/motion.ts`

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

`Runtime/framework → features/dashboard/app-sidebar.tsx → components/ui/sidebar.tsx / lib/utils.ts / lib/motion.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
