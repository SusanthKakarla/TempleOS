# engine.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/notifications/engine.ts` |
| Layer | Notifications |
| Category | Notification Service |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Notification Service in the **Notifications** area. It processes notifications/messages.

Public symbols: `EnqueueNotificationInput`, `enqueueNotification`.

## Actions Performed

- Processes notifications/messages

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `@/lib/db/devotees`, `@/lib/db/notification-preferences`, `@/lib/db/notification-templates`, `@/lib/db/notifications`, `@/lib/db/tenant-notification-media`, `@/lib/db/tenants`, `@/types/db`.
- Outputs: exports `EnqueueNotificationInput`, `enqueueNotification`.

## Dependencies

- Internal imports: `lib/db/devotees.ts`, `lib/db/notification-preferences.ts`, `lib/db/notification-templates.ts`, `lib/db/notifications.ts`, `lib/db/tenant-notification-media.ts`, `lib/db/tenants.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `tenants`, `devotees`, `notifications`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 89 lines; 7 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/cron/daily-birthday-check/route.ts`, `app/api/devotees/route.ts`, `app/api/donations/route.ts`, `app/api/super-admin/temples/[tenantId]/features/route.ts`, `app/api/super-admin/temples/[tenantId]/route.ts`, `app/api/super-admin/temples/[tenantId]/status/route.ts`, `app/api/users/route.ts`, `lib/notifications/engine.test.ts`
- Imports: `lib/db/devotees.ts`, `lib/db/notification-preferences.ts`, `lib/db/notification-templates.ts`, `lib/db/notifications.ts`, `lib/db/tenant-notification-media.ts`, `lib/db/tenants.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Safe** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 9 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/notifications/engine.ts → lib/db/devotees.ts / lib/db/notification-preferences.ts / lib/db/notification-templates.ts / lib/db/notifications.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
