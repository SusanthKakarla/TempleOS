# whatsapp-conversations.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/whatsapp-conversations.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records.

Public symbols: `ListConversationsFilter`, `listConversations`, `getConversationByDevoteeId`, `markConversationRead`, `touchConversation`, `getWhatsAppStats`.

## Actions Performed

- Reads database
- Creates records
- Updates records

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `pg`, `./pool`, `@/lib/whatsapp/templates`, `@/types/db`.
- Outputs: exports `ListConversationsFilter`, `listConversations`, `getConversationByDevoteeId`, `markConversationRead`, `touchConversation`, `getWhatsAppStats`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/whatsapp/templates.ts`, `types/db.ts`
- External imports: `pg`

## Database Usage

- Tables referenced: `devotees`, `whatsapp_messages`, `whatsapp_conversations`
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

- File size: 201 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `lib/db/whatsapp-messages.ts`
- Imports: `lib/db/pool.ts`, `lib/whatsapp/templates.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Medium** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/db/whatsapp-conversations.ts → lib/db/pool.ts / lib/whatsapp/templates.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
