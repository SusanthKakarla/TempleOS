# tenants.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/tenants.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Critical** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, processes notifications/messages.

Public symbols: `SuperAdminTenantSummary`, `SuperAdminTenantMember`, `SuperAdminTenantDetail`, `CreateTenantForSuperAdminInput`, `createTenantForSuperAdmin`, `getTenantById`, `listTenantIdsAndTimezones`, `listTenantsForSuperAdmin`, `getTenantDetailForSuperAdmin`, `UpdateProvisionedTenantDetailsForSuperAdminInput`, `updateProvisionedTenantDetailsForSuperAdmin`, `UpdateTenantInput`, `updateTenant`, `setTenantStatus`.

## Actions Performed

- Reads database
- Creates records
- Updates records
- Processes notifications/messages

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./pool`, `./query-client`, `./audit-log`, `@/types/db`.
- Outputs: exports `SuperAdminTenantSummary`, `SuperAdminTenantMember`, `SuperAdminTenantDetail`, `CreateTenantForSuperAdminInput`, `createTenantForSuperAdmin`, `getTenantById`, `listTenantIdsAndTimezones`, `listTenantsForSuperAdmin`, `getTenantDetailForSuperAdmin`, `UpdateProvisionedTenantDetailsForSuperAdminInput`, `updateProvisionedTenantDetailsForSuperAdmin`, `UpdateTenantInput`, `updateTenant`, `setTenantStatus`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `lib/db/audit-log.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `tenants`, `persons`, `tenant_domains`, `role_definitions`, `tenant_memberships`, `tenant_membership_roles`, `whatsapp_accounts`, `events`, `donations`, `notifications`
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

- File size: 547 lines; 4 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/chatbot-settings/page.tsx`, `app/(dashboard)/dashboard/devotees/page.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/(super-admin)/super-admin/(shell)/temples/[tenantId]/page.tsx`, `app/(super-admin)/super-admin/(shell)/temples/page.tsx`, `app/api/auth/tenant-context/route.test.ts`, `app/api/auth/tenant-context/route.ts`, `app/api/campaigns/[id]/send/route.ts`, `app/api/campaigns/export/route.ts`, `app/api/cron/daily-birthday-check/route.ts`, `app/api/cron/process-campaign-schedules/route.ts`, `app/api/devotees/export/route.ts`, `app/api/devotees/import/template/route.ts`, `app/api/donations/export/route.ts`, `app/api/donations/route.ts`, `app/api/events/[id]/announce/route.ts`, `app/api/events/[id]/route.ts`, `app/api/events/export/route.ts`, `app/api/events/route.test.ts`, `app/api/events/route.ts`, `app/api/notification-media/[id]/send-festival-greeting/route.ts`, `app/api/super-admin/temples/[tenantId]/features/route.ts`, `app/api/super-admin/temples/[tenantId]/route.test.ts`, `app/api/super-admin/temples/[tenantId]/route.ts`, `app/api/super-admin/temples/[tenantId]/status/route.ts`, `app/api/super-admin/temples/[tenantId]/whatsapp/route.ts`, `app/api/super-admin/temples/route.test.ts`, `app/api/super-admin/temples/route.ts`, `app/api/tenant/route.ts`, `app/api/users/export/route.ts`, `app/api/users/import/template/route.ts`, `app/api/users/route.ts`, `app/api/whatsapp/webhook/route.ts`, `features/dashboard/dashboard-shell.tsx`, `features/super-admin/member-role-editor.tsx`, `features/super-admin/temple-detail-edit-form.tsx`, `features/super-admin/temples-list.tsx`, `lib/auth/session-live.test.ts`, `lib/auth/session.ts`, `lib/db/tenants.test.ts`, `lib/notifications/engine.test.ts`, `lib/notifications/engine.ts`, `lib/provisioning/temples.test.ts`, `lib/provisioning/temples.ts`, `lib/whatsapp/event-notifications.ts`
- Imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `lib/db/audit-log.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Critical** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 9 | 8 | 9 | 9 | 6 | 9 | 8 | 9 | 9 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/db/tenants.ts → lib/db/pool.ts / lib/db/query-client.ts / lib/db/audit-log.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
