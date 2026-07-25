# select.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `components/ui/select.tsx` |
| Layer | Presentation |
| Category | Shared UI Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Shared UI Component in the **Presentation** area. It reads database.

No statically detected named exports.

## Actions Performed

- Reads database

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `@base-ui/react/select`, `@/lib/utils`, `lucide-react`.
- Outputs: side effects or static artifact.

## Dependencies

- Internal imports: `lib/utils.ts`
- External imports: `react`, `@base-ui/react/select`, `lucide-react`

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

- File size: 202 lines; 1 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/campaigns/campaign-form-dialog.tsx`, `features/campaigns/campaigns-table.tsx`, `features/chatbot-settings/whatsapp-templates-tab.tsx`, `features/devotees/devotee-form-dialog.tsx`, `features/devotees/devotees-table.tsx`, `features/devotees/family-form-wizard.tsx`, `features/donations/donation-form-dialog.tsx`, `features/donations/donations-table.tsx`, `features/events/events-table.tsx`, `features/super-admin/tenant-status-control.tsx`, `features/users/edit-user-dialog.tsx`, `features/users/users-table.tsx`
- Imports: `lib/utils.ts`

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

`Runtime/framework → components/ui/select.tsx → lib/utils.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
