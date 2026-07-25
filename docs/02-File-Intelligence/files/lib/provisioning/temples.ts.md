# temples.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/provisioning/temples.ts` |
| Layer | lib |
| Category | Service/Utility |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Service/Utility in the **lib** area. It reads database, updates records.

Public symbols: `PRODUCT_DOMAIN`, `RESERVED_TENANT_SUBDOMAINS`, `ProvisionTempleActor`, `LinkWhatsAppAccountInput`, `ProvisionTempleInput`, `ProvisionTempleResult`, `UpdateProvisionedTempleInput`, `AssignTenantMemberRolesInput`, `ProvisionTempleValidationIssue`, `ProvisionTempleValidationResult`, `UpdateProvisionedTempleValidationResult`, `AssignTenantMemberRolesValidationResult`, `ProvisionTempleError`, `UpdateProvisionedTempleError`, `AssignTenantMemberRolesError`, `parseProvisionTempleInput`, `parseUpdateProvisionedTempleInput`, `parseAssignTenantMemberRolesInput`, `provisionTemple`, `updateProvisionedTemple`, `assignTenantMemberRoles`, `isReservedTenantSubdomain`.

## Actions Performed

- Reads database
- Updates records

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `zod`, `@/lib/db/audit-log`, `@/lib/db/pool`, `@/lib/db/tenant-features`, `@/lib/db/role-definitions`, `@/lib/db/tenant-domains`, `@/lib/db/tenant-memberships`, `@/lib/db/tenants`, `@/lib/db/persons`, `@/lib/db/whatsapp-accounts`, `@/lib/db/unique-violation`, `@/lib/phone.mts`, `@/lib/tenant-domains`, `@/types/db`.
- Outputs: exports `PRODUCT_DOMAIN`, `RESERVED_TENANT_SUBDOMAINS`, `ProvisionTempleActor`, `LinkWhatsAppAccountInput`, `ProvisionTempleInput`, `ProvisionTempleResult`, `UpdateProvisionedTempleInput`, `AssignTenantMemberRolesInput`, `ProvisionTempleValidationIssue`, `ProvisionTempleValidationResult`, `UpdateProvisionedTempleValidationResult`, `AssignTenantMemberRolesValidationResult`, `ProvisionTempleError`, `UpdateProvisionedTempleError`, `AssignTenantMemberRolesError`, `parseProvisionTempleInput`, `parseUpdateProvisionedTempleInput`, `parseAssignTenantMemberRolesInput`, `provisionTemple`, `updateProvisionedTemple`, `assignTenantMemberRoles`, `isReservedTenantSubdomain`.

## Dependencies

- Internal imports: `lib/db/audit-log.ts`, `lib/db/pool.ts`, `lib/db/tenant-features.ts`, `lib/db/role-definitions.ts`, `lib/db/tenant-domains.ts`, `lib/db/tenant-memberships.ts`, `lib/db/tenants.ts`, `lib/db/persons.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/unique-violation.ts`, `lib/phone.mts`, `lib/tenant-domains.ts`, `types/db.ts`
- External imports: `zod`

## Database Usage

- Tables referenced: `tenants`, `persons`, `features`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: Runtime/schema validation detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 875 lines; 13 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.test.ts`, `app/api/super-admin/temples/[tenantId]/members/[membershipId]/roles/route.ts`, `app/api/super-admin/temples/[tenantId]/route.test.ts`, `app/api/super-admin/temples/[tenantId]/route.ts`, `app/api/super-admin/temples/route.test.ts`, `app/api/super-admin/temples/route.ts`, `lib/provisioning/temples.test.ts`, `scripts/provision-temple.mts`, `scripts/provision-temple.test.ts`
- Imports: `lib/db/audit-log.ts`, `lib/db/pool.ts`, `lib/db/tenant-features.ts`, `lib/db/role-definitions.ts`, `lib/db/tenant-domains.ts`, `lib/db/tenant-memberships.ts`, `lib/db/tenants.ts`, `lib/db/persons.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/unique-violation.ts`, `lib/phone.mts`, `lib/tenant-domains.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 7 | 6 | 7 | 7 | 7 | 9 | 8 | 9 | 7 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/provisioning/temples.ts → lib/db/audit-log.ts / lib/db/pool.ts / lib/db/tenant-features.ts / lib/db/role-definitions.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
