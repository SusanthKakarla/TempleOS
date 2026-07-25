# devotee-form-dialog.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/devotees/devotee-form-dialog.tsx` |
| Layer | Devotees |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Devotees** area. It reads database, calls an external api, processes notifications/messages.

Public symbols: `DevoteeFormDialog`.

## Actions Performed

- Reads database
- Calls an external API
- Processes notifications/messages

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/navigation`, `next-intl`, `lucide-react`, `@/types/db`, `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/input`, `@/components/ui/label`, `@/components/ui/labeled-input`, `@/components/ui/select`, `@/components/ui/switch`, `@/components/ui/textarea`.
- Outputs: exports `DevoteeFormDialog`.

## Dependencies

- Internal imports: `types/db.ts`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/labeled-input.tsx`, `components/ui/select.tsx`, `components/ui/switch.tsx`, `components/ui/textarea.tsx`
- External imports: `react`, `next/navigation`, `next-intl`, `lucide-react`

## Database Usage

- Tables referenced: `events`, `devotees`
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

- File size: 386 lines; 10 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/devotees/devotees-table.tsx`
- Imports: `types/db.ts`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/labeled-input.tsx`, `components/ui/select.tsx`, `components/ui/switch.tsx`, `components/ui/textarea.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 9 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/devotees/devotee-form-dialog.tsx → types/db.ts / components/ui/badge.tsx / components/ui/button.tsx / components/ui/dialog.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
