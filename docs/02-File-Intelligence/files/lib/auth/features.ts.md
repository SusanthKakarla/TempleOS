# features.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/auth/features.ts` |
| Layer | Security |
| Category | Authentication/Authorization |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Authentication/Authorization in the **Security** area. It returns an http response.

Public symbols: `requireTenantFeature`, `requireTenantFeatureApi`.

## Actions Performed

- Returns an HTTP response

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/navigation`, `next/server`, `@/lib/db/tenant-features`, `@/types/db`.
- Outputs: exports `requireTenantFeature`, `requireTenantFeatureApi`.

## Dependencies

- Internal imports: `lib/db/tenant-features.ts`, `types/db.ts`
- External imports: `next/navigation`, `next/server`

## Database Usage

- Tables referenced: `features`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 30 lines; 2 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/campaigns/[id]/page.tsx`, `app/(dashboard)/dashboard/campaigns/page.tsx`, `app/(dashboard)/dashboard/chatbot-settings/page.tsx`, `app/(dashboard)/dashboard/devotees/page.tsx`, `app/(dashboard)/dashboard/donations/page.tsx`, `app/(dashboard)/dashboard/events/page.tsx`, `app/(dashboard)/dashboard/users/page.tsx`, `app/api/campaigns/[id]/analytics/route.ts`, `app/api/campaigns/[id]/duplicate/route.ts`, `app/api/campaigns/[id]/route.ts`, `app/api/campaigns/[id]/schedule/route.ts`, `app/api/campaigns/[id]/send/route.ts`, `app/api/campaigns/[id]/status/route.ts`, `app/api/campaigns/audience-preview/route.ts`, `app/api/campaigns/export/route.ts`, `app/api/campaigns/route.ts`, `app/api/devotees/route.ts`, `app/api/donations/route.ts`, `app/api/events/route.ts`, `app/api/users/route.ts`
- Imports: `lib/db/tenant-features.ts`, `types/db.ts`

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

`Runtime/framework → lib/auth/features.ts → lib/db/tenant-features.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
