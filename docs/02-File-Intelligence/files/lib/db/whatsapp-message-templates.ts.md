# whatsapp-message-templates.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/whatsapp-message-templates.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, deletes records, processes notifications/messages.

Public symbols: `getApprovedTemplate`, `listTemplatesForTenant`, `getTemplateById`, `CreateWhatsAppMessageTemplateInput`, `createTemplate`, `InsertTemplateIfMissingInput`, `insertTemplateIfMissing`, `UpdateWhatsAppMessageTemplateInput`, `updateTemplate`, `setApprovalStatus`, `listPendingTemplatesForTenant`, `deleteTemplate`.

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

- Inputs: imports from `./pool`, `@/types/db`.
- Outputs: exports `getApprovedTemplate`, `listTemplatesForTenant`, `getTemplateById`, `CreateWhatsAppMessageTemplateInput`, `createTemplate`, `InsertTemplateIfMissingInput`, `insertTemplateIfMissing`, `UpdateWhatsAppMessageTemplateInput`, `updateTemplate`, `setApprovalStatus`, `listPendingTemplatesForTenant`, `deleteTemplate`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `whatsapp_message_templates`
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

- File size: 230 lines; 2 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/chatbot-settings/page.tsx`, `app/api/cron/sync-whatsapp-templates/route.ts`, `app/api/whatsapp/templates/[id]/route.ts`, `app/api/whatsapp/templates/[id]/sync/route.ts`, `app/api/whatsapp/templates/[id]/test-send/route.ts`, `app/api/whatsapp/templates/route.ts`, `app/api/whatsapp/templates/setup/route.ts`, `lib/db/whatsapp-message-templates.test.ts`, `lib/whatsapp/template-bootstrap.test.ts`, `lib/whatsapp/template-bootstrap.ts`, `lib/whatsapp/template-registry.ts`
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

`Runtime/framework → lib/db/whatsapp-message-templates.ts → lib/db/pool.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
