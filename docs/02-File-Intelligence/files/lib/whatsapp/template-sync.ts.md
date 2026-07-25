# template-sync.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/whatsapp/template-sync.ts` |
| Layer | WhatsApp |
| Category | WhatsApp Service |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

WhatsApp Service in the **WhatsApp** area. It calls an external api.

Public symbols: `syncTemplateApprovalStatus`.

## Actions Performed

- Calls an external API

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./graph-api`, `@/types/db`; environment: `WHATSAPP_ACCESS_TOKEN`.
- Outputs: exports `syncTemplateApprovalStatus`.

## Dependencies

- Internal imports: `lib/whatsapp/graph-api.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: None detected
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: environment variables only (WHATSAPP_ACCESS_TOKEN)
- Rate limiting: Not implemented locally

## Performance

- File size: 54 lines; 2 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/cron/sync-whatsapp-templates/route.ts`, `app/api/whatsapp/templates/[id]/sync/route.ts`, `app/api/whatsapp/templates/setup/route.ts`
- Imports: `lib/whatsapp/graph-api.ts`, `types/db.ts`

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

`Runtime/framework → lib/whatsapp/template-sync.ts → lib/whatsapp/graph-api.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
