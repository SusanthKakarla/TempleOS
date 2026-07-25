# require-super-admin.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `app/(super-admin)/super-admin/require-super-admin.ts` |
| Layer | app |
| Category | Asset |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Asset in the **app** area. It creates or validates sessions.

Public symbols: `requireSuperAdminPage`.

## Actions Performed

- Creates or validates sessions

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/headers`, `next/navigation`, `@/lib/auth/super-admin-session`, `@/types/db`.
- Outputs: exports `requireSuperAdminPage`.

## Dependencies

- Internal imports: `lib/auth/super-admin-session.ts`, `types/db.ts`
- External imports: `next/headers`, `next/navigation`

## Database Usage

- Tables referenced: None detected
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 22 lines; 2 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(super-admin)/super-admin/(shell)/admins/page.tsx`, `app/(super-admin)/super-admin/(shell)/layout.tsx`, `app/(super-admin)/super-admin/(shell)/page.tsx`, `app/(super-admin)/super-admin/(shell)/roles/page.tsx`, `app/(super-admin)/super-admin/(shell)/temples/[tenantId]/page.tsx`, `app/(super-admin)/super-admin/(shell)/temples/new/page.tsx`, `app/(super-admin)/super-admin/(shell)/temples/page.tsx`
- Imports: `lib/auth/super-admin-session.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Medium** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → app/(super-admin)/super-admin/require-super-admin.ts → lib/auth/super-admin-session.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../../README.md)
- [API Catalog](../../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../../06-Reference/Database-Catalog.md)
