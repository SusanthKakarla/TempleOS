# whatsapp-accounts.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/whatsapp-accounts.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, deletes records.

Public symbols: `getWhatsAppAccountByPhoneNumberId`, `getWhatsAppAccountByTenant`, `listConnectedWhatsAppAccounts`, `UpsertWhatsAppAccountInput`, `LinkWhatsAppAccountForProvisioningInput`, `ManuallyConnectWhatsAppAccountInput`, `linkWhatsAppAccountForProvisioning`, `manuallyConnectWhatsAppAccount`, `deleteWhatsAppAccount`, `CompleteEmbeddedSignupInput`, `completeEmbeddedSignup`, `disconnectWhatsAppAccount`.

## Actions Performed

- Reads database
- Creates records
- Updates records
- Deletes records

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./pool`, `./query-client`, `@/types/db`.
- Outputs: exports `getWhatsAppAccountByPhoneNumberId`, `getWhatsAppAccountByTenant`, `listConnectedWhatsAppAccounts`, `UpsertWhatsAppAccountInput`, `LinkWhatsAppAccountForProvisioningInput`, `ManuallyConnectWhatsAppAccountInput`, `linkWhatsAppAccountForProvisioning`, `manuallyConnectWhatsAppAccount`, `deleteWhatsAppAccount`, `CompleteEmbeddedSignupInput`, `completeEmbeddedSignup`, `disconnectWhatsAppAccount`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `whatsapp_accounts`
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

- File size: 209 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/chatbot-settings/page.tsx`, `app/api/campaigns/[id]/send/route.ts`, `app/api/cron/sync-whatsapp-templates/route.ts`, `app/api/events/[id]/announce/route.ts`, `app/api/super-admin/temples/[tenantId]/whatsapp/route.ts`, `app/api/whatsapp/connect/callback/route.ts`, `app/api/whatsapp/disconnect/route.ts`, `app/api/whatsapp/templates/[id]/sync/route.ts`, `app/api/whatsapp/templates/[id]/test-send/route.ts`, `app/api/whatsapp/templates/setup/route.ts`, `app/api/whatsapp/webhook/route.ts`, `lib/db/whatsapp-accounts.test.ts`, `lib/notifications/delivery.ts`, `lib/provisioning/temples.test.ts`, `lib/provisioning/temples.ts`, `lib/whatsapp/event-notifications.ts`
- Imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `types/db.ts`

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

`Runtime/framework → lib/db/whatsapp-accounts.ts → lib/db/pool.ts / lib/db/query-client.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
