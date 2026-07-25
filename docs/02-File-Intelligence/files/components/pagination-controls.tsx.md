# pagination-controls.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `components/pagination-controls.tsx` |
| Layer | Presentation |
| Category | Shared UI Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Shared UI Component in the **Presentation** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `PaginationControls`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/link`, `next/navigation`, `lucide-react`, `@/components/ui/button`, `@/lib/utils`, `@/lib/url-params`, `@/lib/pagination`.
- Outputs: exports `PaginationControls`.

## Dependencies

- Internal imports: `components/ui/button.tsx`, `lib/utils.ts`, `lib/url-params.ts`, `lib/pagination.ts`
- External imports: `next/link`, `next/navigation`, `lucide-react`

## Database Usage

- Tables referenced: `events`
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

- File size: 109 lines; 4 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/campaigns/campaigns-table.tsx`, `features/chatbot-settings/faqs-table.tsx`, `features/chatbot-settings/sevas-table.tsx`, `features/chatbot-settings/special-days-table.tsx`, `features/devotees/devotees-table.tsx`, `features/donations/donations-table.tsx`, `features/events/events-table.tsx`, `features/notifications/automated-notification-list.tsx`, `features/super-admin/admins-list.tsx`, `features/super-admin/temples-list.tsx`, `features/users/activity-log-table.tsx`, `features/users/users-table.tsx`
- Imports: `components/ui/button.tsx`, `lib/utils.ts`, `lib/url-params.ts`, `lib/pagination.ts`

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

`Runtime/framework → components/pagination-controls.tsx → components/ui/button.tsx / lib/utils.ts / lib/url-params.ts / lib/pagination.ts`

## Cross References

- [File Intelligence Index](../../README.md)
- [API Catalog](../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../06-Reference/Database-Catalog.md)
