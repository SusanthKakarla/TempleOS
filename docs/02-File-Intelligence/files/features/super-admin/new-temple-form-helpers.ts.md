# new-temple-form-helpers.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/super-admin/new-temple-form-helpers.ts` |
| Layer | Super Admin |
| Category | Feature Component |
| Runtime | React (server/client determined by parent) |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Feature Component in the **Super Admin** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `PRODUCT_DOMAIN`, `RESERVED_SUBDOMAINS`, `ROLE_OPTIONS`, `NewTempleFormState`, `ProvisionTemplePayload`, `ProvisionTempleSuccess`, `NewTempleFormErrors`, `BuildProvisionTemplePayloadResult`, `DEFAULT_NEW_TEMPLE_FORM_STATE`, `normalizeSubdomainInput`, `fullHostnamePreview`, `validateNewTempleForm`, `buildProvisionTemplePayload`, `formErrorsFromApiError`, `fieldKeyFromPath`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `@/types/db`, `@/lib/db/tenant-memberships`.
- Outputs: exports `PRODUCT_DOMAIN`, `RESERVED_SUBDOMAINS`, `ROLE_OPTIONS`, `NewTempleFormState`, `ProvisionTemplePayload`, `ProvisionTempleSuccess`, `NewTempleFormErrors`, `BuildProvisionTemplePayloadResult`, `DEFAULT_NEW_TEMPLE_FORM_STATE`, `normalizeSubdomainInput`, `fullHostnamePreview`, `validateNewTempleForm`, `buildProvisionTemplePayload`, `formErrorsFromApiError`, `fieldKeyFromPath`.

## Dependencies

- Internal imports: `types/db.ts`, `lib/db/tenant-memberships.ts`
- External imports: None detected

## Database Usage

- Tables referenced: None detected
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 294 lines; 2 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/super-admin/new-temple-form-helpers.test.ts`, `features/super-admin/new-temple-form.tsx`
- Imports: `types/db.ts`, `lib/db/tenant-memberships.ts`

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

`Runtime/framework → features/super-admin/new-temple-form-helpers.ts → types/db.ts / lib/db/tenant-memberships.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
