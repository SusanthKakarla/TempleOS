# page.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `app/(super-admin)/super-admin/(shell)/temples/new/page.tsx` |
| Layer | Presentation |
| Category | Page |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Page in the **Presentation** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `NewTemplePage`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: Server rendering and page navigation
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/link`, `lucide-react`, `@/components/ui/button`, `@/components/page-header`, `@/features/super-admin/new-temple-form`, `@/lib/db/features`, `../../../require-super-admin`.
- Outputs: exports `NewTemplePage`.

## Dependencies

- Internal imports: `components/ui/button.tsx`, `components/page-header.tsx`, `features/super-admin/new-temple-form.tsx`, `lib/db/features.ts`, `app/(super-admin)/super-admin/require-super-admin.ts`
- External imports: `next/link`, `lucide-react`

## Database Usage

- Tables referenced: `features`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 27 lines; 5 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `components/ui/button.tsx`, `components/page-header.tsx`, `features/super-admin/new-temple-form.tsx`, `lib/db/features.ts`, `app/(super-admin)/super-admin/require-super-admin.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Medium** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → app/(super-admin)/super-admin/(shell)/temples/new/page.tsx → components/ui/button.tsx / components/page-header.tsx / features/super-admin/new-temple-form.tsx / lib/db/features.ts`

## Cross References

- [File Intelligence Index](../../../../../../../README.md)
- [API Catalog](../../../../../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../../../../../06-Reference/Database-Catalog.md)
