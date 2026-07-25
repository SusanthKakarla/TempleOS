# route.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `app/api/whatsapp/webhook/route.ts` |
| Layer | API |
| Category | API Route |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **High** |

## Purpose and Responsibilities

API Route in the **API** area. It updates records, processes notifications/messages, returns an http response.

Public symbols: `GET`, `POST`.

## Actions Performed

- Updates records
- Processes notifications/messages
- Returns an HTTP response

## Execution

- Trigger: HTTP request
- HTTP methods: GET, POST

## Inputs and Outputs

- Inputs: imports from `next/server`, `@/types/db`, `@/lib/db/whatsapp-accounts`, `@/lib/db/tenants`, `@/lib/db/devotees`, `@/lib/db/whatsapp-messages`, `@/lib/db/whatsapp-interactions`, `@/lib/notifications/delivery`, `@/lib/db/events`, `@/lib/db/temple-special-days`, `@/lib/db/temple-sevas`, `@/lib/db/temple-faqs`, `@/lib/db/temple-social-links`, `@/lib/whatsapp/router`, `@/lib/whatsapp/message-type`, `@/lib/whatsapp/templates`, `@/lib/whatsapp/client`, `@/lib/phone.mts`; environment: `WHATSAPP_VERIFY_TOKEN`.
- Outputs: exports `GET`, `POST`.

## Dependencies

- Internal imports: `types/db.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/tenants.ts`, `lib/db/devotees.ts`, `lib/db/whatsapp-messages.ts`, `lib/db/whatsapp-interactions.ts`, `lib/notifications/delivery.ts`, `lib/db/events.ts`, `lib/db/temple-special-days.ts`, `lib/db/temple-sevas.ts`, `lib/db/temple-faqs.ts`, `lib/db/temple-social-links.ts`, `lib/whatsapp/router.ts`, `lib/whatsapp/message-type.ts`, `lib/whatsapp/templates.ts`, `lib/whatsapp/client.ts`, `lib/phone.mts`
- External imports: `next/server`

## Database Usage

- Tables referenced: `tenants`, `events`, `devotees`, `notifications`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: GET, POST
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: environment variables only (WHATSAPP_VERIFY_TOKEN)
- Rate limiting: Not implemented locally

## Performance

- File size: 248 lines; 17 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `types/db.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/tenants.ts`, `lib/db/devotees.ts`, `lib/db/whatsapp-messages.ts`, `lib/db/whatsapp-interactions.ts`, `lib/notifications/delivery.ts`, `lib/db/events.ts`, `lib/db/temple-special-days.ts`, `lib/db/temple-sevas.ts`, `lib/db/temple-faqs.ts`, `lib/db/temple-social-links.ts`, `lib/whatsapp/router.ts`, `lib/whatsapp/message-type.ts`, `lib/whatsapp/templates.ts`, `lib/whatsapp/client.ts`, `lib/phone.mts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **High** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 9 | 9 | 9 | 9 | 9 | 7 | 8 | 7 | 9 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → app/api/whatsapp/webhook/route.ts → types/db.ts / lib/db/whatsapp-accounts.ts / lib/db/tenants.ts / lib/db/devotees.ts`

## Cross References

- [File Intelligence Index](../../../../../README.md)
- [API Catalog](../../../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../../../06-Reference/Database-Catalog.md)
