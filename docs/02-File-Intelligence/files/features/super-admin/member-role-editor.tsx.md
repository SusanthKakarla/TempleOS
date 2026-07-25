# member-role-editor.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/super-admin/member-role-editor.tsx` |
| Layer | Super Admin |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Feature Component in the **Super Admin** area. It calls an external api.

Public symbols: `MemberRoleEditor`.

## Actions Performed

- Calls an external API

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/navigation`, `react`, `lucide-react`, `@/components/ui/button`, `@/components/ui/checkbox`, `@/components/ui/dialog`, `@/lib/db/tenants`, `@/types/db`, `./member-role-editor-helpers`.
- Outputs: exports `MemberRoleEditor`.

## Dependencies

- Internal imports: `components/ui/button.tsx`, `components/ui/checkbox.tsx`, `components/ui/dialog.tsx`, `lib/db/tenants.ts`, `types/db.ts`, `features/super-admin/member-role-editor-helpers.ts`
- External imports: `next/navigation`, `react`, `lucide-react`

## Database Usage

- Tables referenced: `tenants`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 153 lines; 6 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(super-admin)/super-admin/(shell)/temples/[tenantId]/page.tsx`
- Imports: `components/ui/button.tsx`, `components/ui/checkbox.tsx`, `components/ui/dialog.tsx`, `lib/db/tenants.ts`, `types/db.ts`, `features/super-admin/member-role-editor-helpers.ts`

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

`Runtime/framework → features/super-admin/member-role-editor.tsx → components/ui/button.tsx / components/ui/checkbox.tsx / components/ui/dialog.tsx / lib/db/tenants.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
