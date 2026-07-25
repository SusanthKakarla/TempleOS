# notifications.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/notifications.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **High** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, processes notifications/messages.

Public symbols: `CreateNotificationInput`, `createNotification`, `listDueNotifications`, `claimNotification`, `DeliveryMetadata`, `markNotificationSent`, `getNotificationByProviderMessageId`, `markNotificationDelivered`, `markNotificationReadReceipt`, `computeRetryState`, `markNotificationPermanentlyFailed`, `markNotificationFailed`, `ListNotificationsForRecipientOptions`, `listNotificationsForPerson`, `countUnreadNotificationsForPerson`, `markNotificationRead`, `countSentNotifications`, `NotificationCategoryCounts`, `countNotificationsByCategory`, `countStuckRetryingNotifications`, `countPendingNotifications`, `listNotificationsForDevotee`, `countNotificationsFiltered`, `NotificationListItem`, `listRecentNotifications`, `WhatsAppDeliveryAnalytics`, `getWhatsAppDeliveryAnalytics`.

## Actions Performed

- Reads database
- Creates records
- Updates records
- Processes notifications/messages

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./pool`, `@/types/db`, `@/lib/pagination`.
- Outputs: exports `CreateNotificationInput`, `createNotification`, `listDueNotifications`, `claimNotification`, `DeliveryMetadata`, `markNotificationSent`, `getNotificationByProviderMessageId`, `markNotificationDelivered`, `markNotificationReadReceipt`, `computeRetryState`, `markNotificationPermanentlyFailed`, `markNotificationFailed`, `ListNotificationsForRecipientOptions`, `listNotificationsForPerson`, `countUnreadNotificationsForPerson`, `markNotificationRead`, `countSentNotifications`, `NotificationCategoryCounts`, `countNotificationsByCategory`, `countStuckRetryingNotifications`, `countPendingNotifications`, `listNotificationsForDevotee`, `countNotificationsFiltered`, `NotificationListItem`, `listRecentNotifications`, `WhatsAppDeliveryAnalytics`, `getWhatsAppDeliveryAnalytics`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `types/db.ts`, `lib/pagination.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `persons`, `events`, `devotees`, `whatsapp_messages`, `event_notifications`, `notifications`
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

- File size: 551 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/chatbot-settings/page.tsx`, `app/(dashboard)/dashboard/devotees/[id]/page.tsx`, `app/api/cron/process-notifications/route.ts`, `app/api/events/[id]/announce/route.ts`, `features/notifications/automated-notification-list.tsx`, `features/notifications/notification-detail-drawer.tsx`, `lib/db/notifications.test.ts`, `lib/notifications/delivery.ts`, `lib/notifications/engine.test.ts`, `lib/notifications/engine.ts`, `lib/whatsapp/delivery-logger.ts`
- Imports: `lib/db/pool.ts`, `types/db.ts`, `lib/pagination.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **High** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 7 | 8 | 8 | 8 | 9 | 8 | 9 | 8 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/db/notifications.ts → lib/db/pool.ts / types/db.ts / lib/pagination.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
