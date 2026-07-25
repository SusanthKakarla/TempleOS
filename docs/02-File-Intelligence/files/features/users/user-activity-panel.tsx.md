# user-activity-panel.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/users/user-activity-panel.tsx` |
| Layer | Users |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Feature Component in the **Users** area. It calls an external api.

Public symbols: `UserActivityPanel`.

## Actions Performed

- Calls an external API

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next-intl`, `@/components/ui/sheet`, `@/lib/db/tenant-memberships`, `@/types/db`, `@/lib/date`.
- Outputs: exports `UserActivityPanel`.

## Dependencies

- Internal imports: `components/ui/sheet.tsx`, `lib/db/tenant-memberships.ts`, `types/db.ts`, `lib/date.ts`
- External imports: `react`, `next-intl`

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

- File size: 77 lines; 4 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/users/users-table.tsx`
- Imports: `components/ui/sheet.tsx`, `lib/db/tenant-memberships.ts`, `types/db.ts`, `lib/date.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Safe** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/users/user-activity-panel.tsx → components/ui/sheet.tsx / lib/db/tenant-memberships.ts / types/db.ts / lib/date.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
