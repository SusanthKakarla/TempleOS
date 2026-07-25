# family-form-wizard.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/devotees/family-form-wizard.tsx` |
| Layer | Devotees |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Devotees** area. It reads database, deletes records, calls an external api.

Public symbols: `FamilyFormWizard`.

## Actions Performed

- Reads database
- Deletes records
- Calls an external API

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/navigation`, `next-intl`, `next/link`, `lucide-react`, `@/types/db`, `@/components/ui/button`, `@/components/ui/input`, `@/components/ui/label`, `@/components/ui/card`, `@/components/ui/select`.
- Outputs: exports `FamilyFormWizard`.

## Dependencies

- Internal imports: `types/db.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/card.tsx`, `components/ui/select.tsx`
- External imports: `react`, `next/navigation`, `next-intl`, `next/link`, `lucide-react`

## Database Usage

- Tables referenced: `devotees`
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

- File size: 398 lines; 6 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/devotees/family/[familyId]/edit/page.tsx`, `app/(dashboard)/dashboard/devotees/family/new/page.tsx`
- Imports: `types/db.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/card.tsx`, `components/ui/select.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 9 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/devotees/family-form-wizard.tsx → types/db.ts / components/ui/button.tsx / components/ui/input.tsx / components/ui/label.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
