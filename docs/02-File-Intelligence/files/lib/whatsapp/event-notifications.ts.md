# event-notifications.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/whatsapp/event-notifications.ts` |
| Layer | WhatsApp |
| Category | WhatsApp Service |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

WhatsApp Service in the **WhatsApp** area. It processes notifications/messages, uploads/processes media.

Public symbols: `processEventNotifications`.

## Actions Performed

- Processes notifications/messages
- Uploads/processes media

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `@/lib/db/events`, `@/lib/db/tenants`, `@/lib/db/devotees`, `@/lib/db/notification-media`, `@/lib/db/whatsapp-accounts`, `@/lib/db/whatsapp-messages`, `@/lib/db/event-notifications`, `@/lib/media/imagekit`, `./templates`, `./client`.
- Outputs: exports `processEventNotifications`.

## Dependencies

- Internal imports: `lib/db/events.ts`, `lib/db/tenants.ts`, `lib/db/devotees.ts`, `lib/db/notification-media.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/whatsapp-messages.ts`, `lib/db/event-notifications.ts`, `lib/media/imagekit.ts`, `lib/whatsapp/templates.ts`, `lib/whatsapp/client.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `tenants`, `events`, `devotees`, `event_notifications`, `notifications`
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

- File size: 78 lines; 10 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/cron/process-event-notifications/route.ts`
- Imports: `lib/db/events.ts`, `lib/db/tenants.ts`, `lib/db/devotees.ts`, `lib/db/notification-media.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/whatsapp-messages.ts`, `lib/db/event-notifications.ts`, `lib/media/imagekit.ts`, `lib/whatsapp/templates.ts`, `lib/whatsapp/client.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/whatsapp/event-notifications.ts → lib/db/events.ts / lib/db/tenants.ts / lib/db/devotees.ts / lib/db/notification-media.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
