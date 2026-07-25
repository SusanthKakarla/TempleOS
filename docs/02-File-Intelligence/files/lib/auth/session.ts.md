# session.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/auth/session.ts` |
| Layer | Security |
| Category | Authentication/Authorization |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Authentication/Authorization in the **Security** area. It deletes records, creates or validates sessions.

Public symbols: `TENANT_SESSION_COOKIE_NAME`, `TENANT_SESSION_MAX_AGE_SECONDS`, `SessionPayload`, `createSessionToken`, `verifySessionToken`, `setSessionCookie`, `clearSessionCookie`, `getSessionAdmin`.

## Actions Performed

- Deletes records
- Creates or validates sessions

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/headers`, `./session-token`, `@/lib/db/tenant-memberships`, `@/lib/db/tenants`, `@/types/db`; environment: `NODE_ENV`.
- Outputs: exports `TENANT_SESSION_COOKIE_NAME`, `TENANT_SESSION_MAX_AGE_SECONDS`, `SessionPayload`, `createSessionToken`, `verifySessionToken`, `setSessionCookie`, `clearSessionCookie`, `getSessionAdmin`.

## Dependencies

- Internal imports: `lib/auth/session-token.ts`, `lib/db/tenant-memberships.ts`, `lib/db/tenants.ts`, `types/db.ts`
- External imports: `next/headers`

## Database Usage

- Tables referenced: `tenants`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: environment variables only (NODE_ENV)
- Rate limiting: Not implemented locally

## Performance

- File size: 94 lines; 4 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/require-dashboard-admin.ts`, `app/api/auth/session/route.test.ts`, `app/api/auth/session/route.ts`, `app/api/events/route.test.ts`, `app/api/media/upload/route.test.ts`, `app/api/super-admin/admins/[id]/route.ts`, `app/api/super-admin/admins/route.ts`, `app/api/super-admin/me/route.test.ts`, `app/api/super-admin/me/route.ts`, `app/api/super-admin/roles/route.test.ts`, `app/api/super-admin/roles/route.ts`, `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts`, `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.ts`, `app/api/super-admin/temples/[tenantId]/route.test.ts`, `app/api/super-admin/temples/[tenantId]/route.ts`, `app/api/super-admin/temples/route.test.ts`, `app/api/super-admin/temples/route.ts`, `features/dashboard/dashboard-shell.tsx`, `lib/auth/session-live.test.ts`, `lib/auth/session.test.ts`, `lib/auth/tenant-admin.test.ts`, `lib/auth/tenant-admin.ts`
- Imports: `lib/auth/session-token.ts`, `lib/db/tenant-memberships.ts`, `lib/db/tenants.ts`, `types/db.ts`

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

`Runtime/framework → lib/auth/session.ts → lib/auth/session-token.ts / lib/db/tenant-memberships.ts / lib/db/tenants.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
