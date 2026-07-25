# delivery.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/notifications/delivery.ts` |
| Layer | Notifications |
| Category | Notification Service |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Notification Service in the **Notifications** area. It processes notifications/messages, uploads/processes media.

Public symbols: `processNotifications`, `applyWebhookDeliveryStatus`.

## Actions Performed

- Processes notifications/messages
- Uploads/processes media

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `@/lib/db/devotees`, `@/lib/db/persons`, `@/lib/db/notification-media`, `@/lib/db/whatsapp-accounts`, `@/lib/db/audit-log`, `@/lib/db/notifications`, `@/lib/media/imagekit`, `@/lib/whatsapp/errors`, `@/lib/whatsapp/send-notification`, `@/lib/whatsapp/delivery-logger`, `@/types/db`.
- Outputs: exports `processNotifications`, `applyWebhookDeliveryStatus`.

## Dependencies

- Internal imports: `lib/db/devotees.ts`, `lib/db/persons.ts`, `lib/db/notification-media.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/audit-log.ts`, `lib/db/notifications.ts`, `lib/media/imagekit.ts`, `lib/whatsapp/errors.ts`, `lib/whatsapp/send-notification.ts`, `lib/whatsapp/delivery-logger.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `persons`, `devotees`, `audit_log`, `notifications`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp ImageKit

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 152 lines; 11 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/cron/daily-birthday-check/route.ts`, `app/api/cron/process-notifications/route.ts`, `app/api/devotees/route.ts`, `app/api/donations/route.ts`, `app/api/events/[id]/announce/route.ts`, `app/api/events/[id]/route.ts`, `app/api/events/route.ts`, `app/api/notification-media/[id]/send-festival-greeting/route.ts`, `app/api/super-admin/temples/[tenantId]/features/route.ts`, `app/api/super-admin/temples/[tenantId]/route.ts`, `app/api/super-admin/temples/[tenantId]/status/route.ts`, `app/api/users/route.ts`, `app/api/whatsapp/webhook/route.ts`, `lib/campaigns/run-campaign.ts`
- Imports: `lib/db/devotees.ts`, `lib/db/persons.ts`, `lib/db/notification-media.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/audit-log.ts`, `lib/db/notifications.ts`, `lib/media/imagekit.ts`, `lib/whatsapp/errors.ts`, `lib/whatsapp/send-notification.ts`, `lib/whatsapp/delivery-logger.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/notifications/delivery.ts → lib/db/devotees.ts / lib/db/persons.ts / lib/db/notification-media.ts / lib/db/whatsapp-accounts.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
