# temples.test.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/provisioning/temples.test.ts` |
| Layer | Testing |
| Category | Test |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Test in the **Testing** area. It updates records, calls an external api.

No statically detected named exports.

## Actions Performed

- Updates records
- Calls an external API

## Execution

- Trigger: Test runner
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `node:fs`, `node:path`, `vitest`, `@/lib/tenant-domains`, `@/lib/db/pool`, `@/lib/db/role-definitions`, `@/lib/db/tenants`, `@/lib/db/tenant-domains`, `@/lib/db/persons`, `@/lib/db/tenant-memberships`, `@/lib/db/whatsapp-accounts`, `@/lib/db/audit-log`, `./temples`.
- Outputs: side effects or static artifact.

## Dependencies

- Internal imports: `lib/tenant-domains.ts`, `lib/db/pool.ts`, `lib/db/role-definitions.ts`, `lib/db/tenants.ts`, `lib/db/tenant-domains.ts`, `lib/db/persons.ts`, `lib/db/tenant-memberships.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/audit-log.ts`, `lib/provisioning/temples.ts`
- External imports: `node:fs`, `node:path`, `vitest`

## Database Usage

- Tables referenced: `tenants`, `persons`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Firebase Meta/WhatsApp 

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 1086 lines; 10 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `lib/tenant-domains.ts`, `lib/db/pool.ts`, `lib/db/role-definitions.ts`, `lib/db/tenants.ts`, `lib/db/tenant-domains.ts`, `lib/db/persons.ts`, `lib/db/tenant-memberships.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/audit-log.ts`, `lib/provisioning/temples.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 7 | 8 | 8 | 8 | 9 | 8 | 7 | 8 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/provisioning/temples.test.ts → lib/tenant-domains.ts / lib/db/pool.ts / lib/db/role-definitions.ts / lib/db/tenants.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
