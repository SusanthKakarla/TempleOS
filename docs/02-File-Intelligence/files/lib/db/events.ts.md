# events.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/events.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, deletes records, processes notifications/messages.

Public symbols: `ListEventsFilter`, `listEvents`, `countEventsFiltered`, `listEventsByIds`, `listPublishedEventsStartingTomorrow`, `getEventById`, `CreateEventInput`, `createEvent`, `UpdateEventInput`, `updateEvent`, `deleteEvent`, `countUpcomingPublishedEvents`.

## Actions Performed

- Reads database
- Creates records
- Updates records
- Deletes records
- Processes notifications/messages

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./pool`, `@/types/db`, `@/lib/pagination`.
- Outputs: exports `ListEventsFilter`, `listEvents`, `countEventsFiltered`, `listEventsByIds`, `listPublishedEventsStartingTomorrow`, `getEventById`, `CreateEventInput`, `createEvent`, `UpdateEventInput`, `updateEvent`, `deleteEvent`, `countUpcomingPublishedEvents`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `types/db.ts`, `lib/pagination.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `events`, `notifications`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 232 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/events/page.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/api/cron/daily-birthday-check/route.ts`, `app/api/events/[id]/announce/route.ts`, `app/api/events/[id]/route.ts`, `app/api/events/export/route.ts`, `app/api/events/route.test.ts`, `app/api/events/route.ts`, `app/api/whatsapp/webhook/route.ts`, `lib/whatsapp/event-notifications.ts`
- Imports: `lib/db/pool.ts`, `types/db.ts`, `lib/pagination.ts`

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

`Runtime/framework → lib/db/events.ts → lib/db/pool.ts / types/db.ts / lib/pagination.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
