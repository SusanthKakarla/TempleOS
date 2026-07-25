# devotees.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/devotees.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **High** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, deletes records, processes notifications/messages.

Public symbols: `ListDevoteesOptions`, `listDevotees`, `countDevoteesFiltered`, `listDevoteesByIds`, `listExistingPhones`, `listRecentDevotees`, `listDevoteesEligibleForEventReminders`, `listDevoteesWithBirthdayToday`, `listDevoteesWithAnniversaryToday`, `FamilyOccasionReminder`, `listFamilyOccasionRemindersDueTomorrow`, `getDevoteeById`, `getDevoteeByPhone`, `CreateDevoteeInput`, `createDevotee`, `UpsertDevoteeFromWhatsAppInput`, `upsertDevoteeFromWhatsApp`, `updateDevoteePreferredLanguage`, `UpdateDevoteeInput`, `updateDevotee`, `deactivateDevotee`, `reactivateDevotee`, `countDevotees`, `countOptedInDevotees`, `countIndividualDevotees`, `countBirthdaysThisWeek`, `countAnniversariesThisWeek`.

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
- Outputs: exports `ListDevoteesOptions`, `listDevotees`, `countDevoteesFiltered`, `listDevoteesByIds`, `listExistingPhones`, `listRecentDevotees`, `listDevoteesEligibleForEventReminders`, `listDevoteesWithBirthdayToday`, `listDevoteesWithAnniversaryToday`, `FamilyOccasionReminder`, `listFamilyOccasionRemindersDueTomorrow`, `getDevoteeById`, `getDevoteeByPhone`, `CreateDevoteeInput`, `createDevotee`, `UpsertDevoteeFromWhatsAppInput`, `upsertDevoteeFromWhatsApp`, `updateDevoteePreferredLanguage`, `UpdateDevoteeInput`, `updateDevotee`, `deactivateDevotee`, `reactivateDevotee`, `countDevotees`, `countOptedInDevotees`, `countIndividualDevotees`, `countBirthdaysThisWeek`, `countAnniversariesThisWeek`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `types/db.ts`, `lib/pagination.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `devotees`, `donations`, `notifications`, `devotee_families`, `family_members`
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

- File size: 597 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/devotees/[id]/page.tsx`, `app/(dashboard)/dashboard/devotees/page.tsx`, `app/(dashboard)/dashboard/donations/page.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/api/cron/daily-birthday-check/route.ts`, `app/api/devotees/[id]/route.ts`, `app/api/devotees/[id]/status/route.ts`, `app/api/devotees/export/route.ts`, `app/api/devotees/import/commit/route.ts`, `app/api/devotees/import/preview/route.ts`, `app/api/devotees/route.ts`, `app/api/donations/route.ts`, `app/api/whatsapp/webhook/route.ts`, `lib/db/devotee-families.ts`, `lib/notifications/delivery.ts`, `lib/notifications/engine.test.ts`, `lib/notifications/engine.ts`, `lib/whatsapp/event-notifications.ts`
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

`Runtime/framework → lib/db/devotees.ts → lib/db/pool.ts / types/db.ts / lib/pagination.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
