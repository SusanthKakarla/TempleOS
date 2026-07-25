# devotee-import-wizard.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/devotees/devotee-import-wizard.tsx` |
| Layer | Devotees |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Feature Component in the **Devotees** area. It calls an external api, uploads/processes media.

Public symbols: `DevoteeImportWizard`.

## Actions Performed

- Calls an external API
- Uploads/processes media

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/navigation`, `next-intl`, `next/link`, `lucide-react`, `@/lib/validation/devotee-import`, `@/lib/utils`, `@/components/ui/button`, `@/components/ui/badge`, `@/components/ui/card`, `@/components/ui/table`, `@/components/ui/tabs`.
- Outputs: exports `DevoteeImportWizard`.

## Dependencies

- Internal imports: `lib/validation/devotee-import.ts`, `lib/utils.ts`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/table.tsx`, `components/ui/tabs.tsx`
- External imports: `react`, `next/navigation`, `next-intl`, `next/link`, `lucide-react`

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

- File size: 311 lines; 7 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/devotees/import/page.tsx`
- Imports: `lib/validation/devotee-import.ts`, `lib/utils.ts`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/table.tsx`, `components/ui/tabs.tsx`

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

`Runtime/framework → features/devotees/devotee-import-wizard.tsx → lib/validation/devotee-import.ts / lib/utils.ts / components/ui/button.tsx / components/ui/badge.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
