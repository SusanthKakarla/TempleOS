# super-admin-session.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/auth/super-admin-session.ts` |
| Layer | Security |
| Category | Authentication/Authorization |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Authentication/Authorization in the **Security** area. It deletes records, creates or validates sessions.

Public symbols: `SUPER_ADMIN_SESSION_COOKIE_NAME`, `SUPER_ADMIN_SESSION_MAX_AGE_SECONDS`, `SuperAdminSessionPayload`, `createSuperAdminSessionToken`, `verifySuperAdminSessionToken`, `setSuperAdminSessionCookie`, `clearSuperAdminSessionCookie`, `getSuperAdminSession`, `requireSuperAdmin`.

## Actions Performed

- Deletes records
- Creates or validates sessions

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next/headers`, `@/lib/db/super-admins`, `@/types/db`, `./session-token`; environment: `NODE_ENV`.
- Outputs: exports `SUPER_ADMIN_SESSION_COOKIE_NAME`, `SUPER_ADMIN_SESSION_MAX_AGE_SECONDS`, `SuperAdminSessionPayload`, `createSuperAdminSessionToken`, `verifySuperAdminSessionToken`, `setSuperAdminSessionCookie`, `clearSuperAdminSessionCookie`, `getSuperAdminSession`, `requireSuperAdmin`.

## Dependencies

- Internal imports: `lib/db/super-admins.ts`, `types/db.ts`, `lib/auth/session-token.ts`
- External imports: `next/headers`

## Database Usage

- Tables referenced: None detected
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

- File size: 78 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(super-admin)/super-admin/login/page.tsx`, `app/(super-admin)/super-admin/require-super-admin.ts`, `app/api/super-admin/admins/[id]/route.ts`, `app/api/super-admin/admins/route.ts`, `app/api/super-admin/auth/session/route.test.ts`, `app/api/super-admin/auth/session/route.ts`, `app/api/super-admin/me/route.test.ts`, `app/api/super-admin/me/route.ts`, `app/api/super-admin/roles/route.test.ts`, `app/api/super-admin/roles/route.ts`, `app/api/super-admin/temples/[tenantId]/features/route.ts`, `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts`, `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.ts`, `app/api/super-admin/temples/[tenantId]/route.test.ts`, `app/api/super-admin/temples/[tenantId]/route.ts`, `app/api/super-admin/temples/[tenantId]/status/route.ts`, `app/api/super-admin/temples/[tenantId]/whatsapp/route.ts`, `app/api/super-admin/temples/route.test.ts`, `app/api/super-admin/temples/route.ts`, `lib/auth/super-admin-session.test.ts`
- Imports: `lib/db/super-admins.ts`, `types/db.ts`, `lib/auth/session-token.ts`

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

`Runtime/framework → lib/auth/super-admin-session.ts → lib/db/super-admins.ts / types/db.ts / lib/auth/session-token.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
