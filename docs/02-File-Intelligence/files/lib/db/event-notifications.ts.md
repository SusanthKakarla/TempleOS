# event-notifications.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/event-notifications.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, updates records, processes notifications/messages.

Public symbols: `listDueEventNotifications`, `claimEventNotification`, `markEventNotificationSent`, `computeRetryState`, `markEventNotificationFailed`.

## Actions Performed

- Reads database
- Updates records
- Processes notifications/messages

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./pool`, `@/types/db`.
- Outputs: exports `listDueEventNotifications`, `claimEventNotification`, `markEventNotificationSent`, `computeRetryState`, `markEventNotificationFailed`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `event_notifications`, `notifications`
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

- File size: 124 lines; 2 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/cron/process-event-notifications/route.ts`, `lib/db/event-notifications.test.ts`, `lib/whatsapp/event-notifications.ts`
- Imports: `lib/db/pool.ts`, `types/db.ts`

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

`Runtime/framework → lib/db/event-notifications.ts → lib/db/pool.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
