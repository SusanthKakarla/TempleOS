# tenant-admin.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/auth/tenant-admin.ts` |
| Layer | Security |
| Category | Authentication/Authorization |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Authentication/Authorization in the **Security** area. It returns an http response.

Public symbols: `TenantAdminAuthResult`, `requireTenantAdminSession`, `tenantAdminAuthResponse`.

## Actions Performed

- Returns an HTTP response

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/server`, `./session`.
- Outputs: exports `TenantAdminAuthResult`, `requireTenantAdminSession`, `tenantAdminAuthResponse`.

## Dependencies

- Internal imports: `lib/auth/session.ts`
- External imports: `next/server`

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

- File size: 43 lines; 1 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/require-dashboard-admin.ts`, `app/api/account/locale/route.ts`, `app/api/audit-log/route.ts`, `app/api/campaigns/[id]/analytics/route.ts`, `app/api/campaigns/[id]/duplicate/route.ts`, `app/api/campaigns/[id]/route.ts`, `app/api/campaigns/[id]/schedule/route.ts`, `app/api/campaigns/[id]/send/route.ts`, `app/api/campaigns/[id]/status/route.ts`, `app/api/campaigns/audience-preview/route.ts`, `app/api/campaigns/export/route.ts`, `app/api/campaigns/route.ts`, `app/api/devotees/[id]/donations/route.ts`, `app/api/devotees/[id]/route.ts`, `app/api/devotees/[id]/status/route.ts`, `app/api/devotees/export/route.ts`, `app/api/devotees/families/[id]/route.ts`, `app/api/devotees/families/route.ts`, `app/api/devotees/import/commit/route.ts`, `app/api/devotees/import/preview/route.ts`, `app/api/devotees/import/template/route.ts`, `app/api/devotees/route.ts`, `app/api/donations/[id]/route.ts`, `app/api/donations/export/route.ts`, `app/api/donations/route.ts`, `app/api/events/[id]/announce/route.ts`, `app/api/events/[id]/route.ts`, `app/api/events/export/route.ts`, `app/api/events/route.test.ts`, `app/api/events/route.ts`, `app/api/media/[id]/route.ts`, `app/api/media/upload/route.test.ts`, `app/api/media/upload/route.ts`, `app/api/notification-media/[id]/send-festival-greeting/route.ts`, `app/api/notification-media/link/route.ts`, `app/api/notification-preferences/route.ts`, `app/api/temple-faqs/[id]/route.ts`, `app/api/temple-faqs/route.ts`, `app/api/temple-sevas/[id]/route.ts`, `app/api/temple-sevas/route.ts`, `app/api/temple-social-links/[platform]/route.ts`, `app/api/temple-special-days/[id]/route.ts`, `app/api/temple-special-days/route.ts`, `app/api/tenant/route.ts`, `app/api/users/[membershipId]/activity/route.ts`, `app/api/users/[membershipId]/roles/route.ts`, `app/api/users/[membershipId]/route.ts`, `app/api/users/[membershipId]/status/route.ts`, `app/api/users/export/route.ts`, `app/api/users/import/commit/route.ts`, `app/api/users/import/preview/route.ts`, `app/api/users/import/template/route.ts`, `app/api/users/route.ts`, `app/api/whatsapp/connect/callback/route.ts`, `app/api/whatsapp/connect/start/route.ts`, `app/api/whatsapp/disconnect/route.ts`, `app/api/whatsapp/templates/[id]/route.ts`, `app/api/whatsapp/templates/[id]/sync/route.ts`, `app/api/whatsapp/templates/[id]/test-send/route.ts`, `app/api/whatsapp/templates/route.ts`, `app/api/whatsapp/templates/setup/route.ts`, `app/page.tsx`, `lib/auth/tenant-admin.test.ts`
- Imports: `lib/auth/session.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Medium** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 9 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/auth/tenant-admin.ts → lib/auth/session.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
