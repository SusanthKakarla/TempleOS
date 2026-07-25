# phone.mts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/phone.mts` |
| Layer | lib |
| Category | Service/Utility |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Service/Utility in the **lib** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `normalizePhoneNumber`, `normalizeWhatsAppId`, `maskPhoneForDisplay`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `libphonenumber-js/core`, `libphonenumber-js/metadata.min.json`.
- Outputs: exports `normalizePhoneNumber`, `normalizeWhatsAppId`, `maskPhoneForDisplay`.

## Dependencies

- Internal imports: None detected
- External imports: `libphonenumber-js/core`, `libphonenumber-js/metadata.min.json`

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
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 35 lines; 0 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/devotees/[id]/route.ts`, `app/api/devotees/families/[id]/route.ts`, `app/api/devotees/families/route.ts`, `app/api/devotees/import/preview/route.ts`, `app/api/devotees/route.ts`, `app/api/users/import/preview/route.ts`, `app/api/whatsapp/webhook/route.ts`, `features/auth/tenant-login-form.tsx`, `features/devotees/devotees-table.tsx`, `features/super-admin/super-admin-login-form.tsx`, `lib/db/persons.ts`, `lib/db/super-admins.ts`, `lib/phone.test.mts`, `lib/phone.test.ts`, `lib/provisioning/temples.ts`, `lib/provisioning/tenant-members.ts`, `lib/validation/devotee-import.ts`, `lib/validation/user-import.ts`, `lib/whatsapp/conversation-resolver.ts`
- Imports: No internal modules

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

`Runtime/framework → lib/phone.mts → output or side effect`

## Cross References

- [File Intelligence Index](../../README.md)
- [API Catalog](../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../06-Reference/Database-Catalog.md)
