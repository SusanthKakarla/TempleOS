# route.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `app/api/super-admin/temples/[tenantId]/whatsapp/route.ts` |
| Layer | Super Admin |
| Category | API Route |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

API Route in the **Super Admin** area. It updates records, deletes records, returns an http response.

Public symbols: `PUT`, `DELETE`.

## Actions Performed

- Updates records
- Deletes records
- Returns an HTTP response

## Execution

- Trigger: HTTP request
- HTTP methods: PUT, DELETE

## Inputs and Outputs

- Inputs: imports from `next/server`, `@/lib/auth/super-admin-session`, `@/lib/db/tenants`, `@/lib/db/whatsapp-accounts`, `@/lib/db/audit-log`, `@/lib/db/unique-violation`, `@/lib/validation/whatsapp-connect`, `@/lib/whatsapp/embedded-signup`, `@/lib/whatsapp/graph-api`; environment: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `NEXT_PUBLIC_WHATSAPP_APP_ID`, `WHATSAPP_APP_SECRET`, `NEXT_PUBLIC_WHATSAPP_CONFIG_ID`.
- Outputs: exports `PUT`, `DELETE`.

## Dependencies

- Internal imports: `lib/auth/super-admin-session.ts`, `lib/db/tenants.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/audit-log.ts`, `lib/db/unique-violation.ts`, `lib/validation/whatsapp-connect.ts`, `lib/whatsapp/embedded-signup.ts`, `lib/whatsapp/graph-api.ts`
- External imports: `next/server`

## Database Usage

- Tables referenced: `tenants`, `whatsapp_accounts`, `events`, `audit_log`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: PUT, DELETE
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: Runtime/schema validation detected
- Secrets: environment variables only (WHATSAPP_ACCESS_TOKEN, WHATSAPP_VERIFY_TOKEN, NEXT_PUBLIC_WHATSAPP_APP_ID, WHATSAPP_APP_SECRET, NEXT_PUBLIC_WHATSAPP_CONFIG_ID)
- Rate limiting: Not implemented locally

## Performance

- File size: 287 lines; 8 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `lib/auth/super-admin-session.ts`, `lib/db/tenants.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/audit-log.ts`, `lib/db/unique-violation.ts`, `lib/validation/whatsapp-connect.ts`, `lib/whatsapp/embedded-signup.ts`, `lib/whatsapp/graph-api.ts`

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

`Runtime/framework → app/api/super-admin/temples/[tenantId]/whatsapp/route.ts → lib/auth/super-admin-session.ts / lib/db/tenants.ts / lib/db/whatsapp-accounts.ts / lib/db/audit-log.ts`

## Cross References

- [File Intelligence Index](../../../../../../../README.md)
- [API Catalog](../../../../../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../../../../../06-Reference/Database-Catalog.md)
