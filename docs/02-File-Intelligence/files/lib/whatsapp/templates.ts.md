# templates.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/whatsapp/templates.ts` |
| Layer | WhatsApp |
| Category | WhatsApp Service |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

WhatsApp Service in the **WhatsApp** area. It processes notifications/messages.

Public symbols: `WhatsAppListMessage`, `WhatsAppButtonMessage`, `buildMenuMessage`, `buildLanguagePickerMessage`, `formatEventDateTime`, `buildNewEventNotification`, `buildEventUpdatedNotification`, `buildEventCancelledNotification`, `buildEventNotificationMessage`, `buildEventsMessage`, `buildContactMessage`, `buildUnknownMessage`, `buildTimingsMessage`, `buildHistoryMessage`, `buildDonationInfoMessage`, `buildHelpMessage`, `buildSevasMessage`, `buildFaqMessage`, `getTenantLocalDateISO`, `getTenantDayStartUTC`.

## Actions Performed

- Processes notifications/messages

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `@/types/db`, `@/lib/currency`, `./i18n`, `./locales/types`, `./client`.
- Outputs: exports `WhatsAppListMessage`, `WhatsAppButtonMessage`, `buildMenuMessage`, `buildLanguagePickerMessage`, `formatEventDateTime`, `buildNewEventNotification`, `buildEventUpdatedNotification`, `buildEventCancelledNotification`, `buildEventNotificationMessage`, `buildEventsMessage`, `buildContactMessage`, `buildUnknownMessage`, `buildTimingsMessage`, `buildHistoryMessage`, `buildDonationInfoMessage`, `buildHelpMessage`, `buildSevasMessage`, `buildFaqMessage`, `getTenantLocalDateISO`, `getTenantDayStartUTC`.

## Dependencies

- Internal imports: `types/db.ts`, `lib/currency.ts`, `lib/whatsapp/i18n.ts`, `lib/whatsapp/locales/types.ts`, `lib/whatsapp/client.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `events`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 366 lines; 5 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/whatsapp/webhook/route.ts`, `lib/db/event-announcements.ts`, `lib/db/whatsapp-conversations.ts`, `lib/whatsapp/event-notifications.ts`, `lib/whatsapp/get-tenant-day-start-utc.test.ts`, `lib/whatsapp/templates.test.ts`
- Imports: `types/db.ts`, `lib/currency.ts`, `lib/whatsapp/i18n.ts`, `lib/whatsapp/locales/types.ts`, `lib/whatsapp/client.ts`

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

`Runtime/framework → lib/whatsapp/templates.ts → types/db.ts / lib/currency.ts / lib/whatsapp/i18n.ts / lib/whatsapp/locales/types.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
