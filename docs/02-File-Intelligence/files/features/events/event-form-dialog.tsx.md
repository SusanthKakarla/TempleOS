# event-form-dialog.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/events/event-form-dialog.tsx` |
| Layer | Events |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Events** area. It calls an external api, processes notifications/messages, uploads/processes media.

Public symbols: `EventFormDialog`.

## Actions Performed

- Calls an external API
- Processes notifications/messages
- Uploads/processes media

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next-intl`, `lucide-react`, `@/types/db`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/label`, `@/components/ui/labeled-input`, `@/components/ui/textarea`, `@/components/ui/switch`, `@/lib/date`, `@/features/media/media-upload`, `./datetime-local`, `./date-time-field`.
- Outputs: exports `EventFormDialog`.

## Dependencies

- Internal imports: `types/db.ts`, `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/label.tsx`, `components/ui/labeled-input.tsx`, `components/ui/textarea.tsx`, `components/ui/switch.tsx`, `lib/date.ts`, `features/media/media-upload.tsx`, `features/events/datetime-local.ts`, `features/events/date-time-field.tsx`
- External imports: `react`, `next-intl`, `lucide-react`

## Database Usage

- Tables referenced: `events`, `features`
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

- File size: 202 lines; 11 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/events/event-card.tsx`, `features/events/events-table.tsx`
- Imports: `types/db.ts`, `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/label.tsx`, `components/ui/labeled-input.tsx`, `components/ui/textarea.tsx`, `components/ui/switch.tsx`, `lib/date.ts`, `features/media/media-upload.tsx`, `features/events/datetime-local.ts`, `features/events/date-time-field.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/events/event-form-dialog.tsx → types/db.ts / components/ui/button.tsx / components/ui/dialog.tsx / components/ui/label.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
