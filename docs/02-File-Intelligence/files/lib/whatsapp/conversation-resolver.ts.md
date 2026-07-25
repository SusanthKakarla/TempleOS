# conversation-resolver.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/whatsapp/conversation-resolver.ts` |
| Layer | WhatsApp |
| Category | WhatsApp Service |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

WhatsApp Service in the **WhatsApp** area. It reads database.

Public symbols: `ConversationStatus`, `resolveConversationStatus`.

## Actions Performed

- Reads database

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `@/lib/db/pool`, `@/lib/phone.mts`.
- Outputs: exports `ConversationStatus`, `resolveConversationStatus`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/phone.mts`
- External imports: None detected

## Database Usage

- Tables referenced: `devotees`, `whatsapp_messages`
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

- File size: 44 lines; 2 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `lib/whatsapp/delivery-strategy.ts`, `lib/whatsapp/send-notification.ts`
- Imports: `lib/db/pool.ts`, `lib/phone.mts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Safe** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/whatsapp/conversation-resolver.ts → lib/db/pool.ts / lib/phone.mts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
