# page.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `app/(dashboard)/dashboard/devotees/[id]/page.tsx` |
| Layer | Presentation |
| Category | Page |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Page in the **Presentation** area. It processes notifications/messages.

Public symbols: `DevoteeDetailPage`.

## Actions Performed

- Processes notifications/messages

## Execution

- Trigger: Server rendering and page navigation
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/link`, `next/navigation`, `next-intl/server`, `lucide-react`, `../../require-dashboard-admin`, `@/lib/db/devotees`, `@/lib/db/devotee-families`, `@/lib/db/donations`, `@/lib/db/notifications`, `@/components/ui/badge`, `@/components/ui/card`, `@/components/ui/avatar`, `@/components/fade-in`, `@/lib/currency`, `@/lib/date`, `@/types/db`, `@/features/donations/devotee-donations-card`.
- Outputs: exports `DevoteeDetailPage`.

## Dependencies

- Internal imports: `app/(dashboard)/dashboard/require-dashboard-admin.ts`, `lib/db/devotees.ts`, `lib/db/devotee-families.ts`, `lib/db/donations.ts`, `lib/db/notifications.ts`, `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/avatar.tsx`, `components/fade-in.tsx`, `lib/currency.ts`, `lib/date.ts`, `types/db.ts`, `features/donations/devotee-donations-card.tsx`
- External imports: `next/link`, `next/navigation`, `next-intl/server`, `lucide-react`

## Database Usage

- Tables referenced: `devotees`, `donations`, `notifications`, `features`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 289 lines; 13 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `app/(dashboard)/dashboard/require-dashboard-admin.ts`, `lib/db/devotees.ts`, `lib/db/devotee-families.ts`, `lib/db/donations.ts`, `lib/db/notifications.ts`, `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/avatar.tsx`, `components/fade-in.tsx`, `lib/currency.ts`, `lib/date.ts`, `types/db.ts`, `features/donations/devotee-donations-card.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 9 | 9 | 9 | 9 | 9 | 7 | 8 | 7 | 9 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → app/(dashboard)/dashboard/devotees/[id]/page.tsx → app/(dashboard)/dashboard/require-dashboard-admin.ts / lib/db/devotees.ts / lib/db/devotee-families.ts / lib/db/donations.ts`

## Cross References

- [File Intelligence Index](../../../../../../README.md)
- [API Catalog](../../../../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../../../../06-Reference/Database-Catalog.md)
