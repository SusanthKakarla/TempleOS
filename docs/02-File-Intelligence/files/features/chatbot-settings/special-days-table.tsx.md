# special-days-table.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/chatbot-settings/special-days-table.tsx` |
| Layer | Chatbot Settings |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Chatbot Settings** area. It deletes records, calls an external api.

Public symbols: `SpecialDaysTable`.

## Actions Performed

- Deletes records
- Calls an external API

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/navigation`, `next-intl`, `lucide-react`, `@/types/db`, `@/components/ui/button`, `@/components/ui/badge`, `@/components/ui/card`, `@/components/ui/table`, `@/components/mobile-list-view`, `@/components/mobile-list-row`, `@/components/pagination-controls`, `@/lib/pagination`, `@/lib/date`, `./special-day-form-dialog`.
- Outputs: exports `SpecialDaysTable`.

## Dependencies

- Internal imports: `types/db.ts`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/table.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `components/pagination-controls.tsx`, `lib/pagination.ts`, `lib/date.ts`, `features/chatbot-settings/special-day-form-dialog.tsx`
- External imports: `react`, `next/navigation`, `next-intl`, `lucide-react`

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

- File size: 212 lines; 11 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/chatbot-settings/chatbot-settings-tabs.tsx`
- Imports: `types/db.ts`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/table.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `components/pagination-controls.tsx`, `lib/pagination.ts`, `lib/date.ts`, `features/chatbot-settings/special-day-form-dialog.tsx`

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

`Runtime/framework → features/chatbot-settings/special-days-table.tsx → types/db.ts / components/ui/button.tsx / components/ui/badge.tsx / components/ui/card.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
