# page.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `app/(super-admin)/super-admin/(shell)/temples/[tenantId]/page.tsx` |
| Layer | Presentation |
| Category | Page |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **High** |

## Purpose and Responsibilities

Page in the **Presentation** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `SuperAdminTempleDetailPage`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: Server rendering and page navigation
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/link`, `next/navigation`, `lucide-react`, `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/table`, `@/components/table-shell`, `@/components/empty-state`, `@/components/page-header`, `@/components/mobile-list-view`, `@/components/mobile-list-row`, `@/features/super-admin/temple-detail-edit-form`, `@/features/super-admin/whatsapp-connection-form`, `@/features/super-admin/member-role-editor`, `@/features/super-admin/tenant-status-control`, `@/features/super-admin/tenant-feature-management-card`, `@/lib/db/role-definitions`, `@/lib/db/tenant-features`, `@/lib/db/audit-log`, `@/lib/db/tenants`, `../../../require-super-admin`.
- Outputs: exports `SuperAdminTempleDetailPage`.

## Dependencies

- Internal imports: `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/empty-state.tsx`, `components/page-header.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `features/super-admin/temple-detail-edit-form.tsx`, `features/super-admin/whatsapp-connection-form.tsx`, `features/super-admin/member-role-editor.tsx`, `features/super-admin/tenant-status-control.tsx`, `features/super-admin/tenant-feature-management-card.tsx`, `lib/db/role-definitions.ts`, `lib/db/tenant-features.ts`, `lib/db/audit-log.ts`, `lib/db/tenants.ts`, `app/(super-admin)/super-admin/require-super-admin.ts`
- External imports: `next/link`, `next/navigation`, `lucide-react`

## Database Usage

- Tables referenced: `tenants`, `features`
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

- File size: 344 lines; 18 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`, `components/empty-state.tsx`, `components/page-header.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `features/super-admin/temple-detail-edit-form.tsx`, `features/super-admin/whatsapp-connection-form.tsx`, `features/super-admin/member-role-editor.tsx`, `features/super-admin/tenant-status-control.tsx`, `features/super-admin/tenant-feature-management-card.tsx`, `lib/db/role-definitions.ts`, `lib/db/tenant-features.ts`, `lib/db/audit-log.ts`, `lib/db/tenants.ts`, `app/(super-admin)/super-admin/require-super-admin.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **High** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 9 | 9 | 9 | 9 | 9 | 7 | 8 | 7 | 9 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → app/(super-admin)/super-admin/(shell)/temples/[tenantId]/page.tsx → components/ui/badge.tsx / components/ui/button.tsx / components/ui/table.tsx / components/table-shell.tsx`

## Cross References

- [File Intelligence Index](../../../../../../../README.md)
- [API Catalog](../../../../../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../../../../../06-Reference/Database-Catalog.md)
