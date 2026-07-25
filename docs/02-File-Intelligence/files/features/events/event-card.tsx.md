# event-card.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/events/event-card.tsx` |
| Layer | Events |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Events** area. It deletes records.

Public symbols: `EventCard`.

## Actions Performed

- Deletes records

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `framer-motion`, `next-intl`, `lucide-react`, `@/types/db`, `@/components/ui/card`, `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/switch`, `@/lib/date`, `@/lib/motion`, `./event-form-dialog`, `./announce-dialog`.
- Outputs: exports `EventCard`.

## Dependencies

- Internal imports: `types/db.ts`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/switch.tsx`, `lib/date.ts`, `lib/motion.ts`, `features/events/event-form-dialog.tsx`, `features/events/announce-dialog.tsx`
- External imports: `framer-motion`, `next-intl`, `lucide-react`

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

- File size: 132 lines; 9 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/events/events-table.tsx`
- Imports: `types/db.ts`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/switch.tsx`, `lib/date.ts`, `lib/motion.ts`, `features/events/event-form-dialog.tsx`, `features/events/announce-dialog.tsx`

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

`Runtime/framework → features/events/event-card.tsx → types/db.ts / components/ui/card.tsx / components/ui/badge.tsx / components/ui/button.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
