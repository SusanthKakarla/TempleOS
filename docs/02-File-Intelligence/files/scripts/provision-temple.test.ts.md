# provision-temple.test.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `scripts/provision-temple.test.ts` |
| Layer | Testing |
| Category | Test |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Test in the **Testing** area. It creates records.

No statically detected named exports.

## Actions Performed

- Creates records

## Execution

- Trigger: Test runner
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `node:fs`, `node:path`, `vitest`, `@/lib/db/pool`, `@/lib/provisioning/temples`, `./provision-temple.mts`.
- Outputs: side effects or static artifact.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/provisioning/temples.ts`, `scripts/provision-temple.mts`
- External imports: `node:fs`, `node:path`, `vitest`

## Database Usage

- Tables referenced: `tenants`, `tenant_domains`, `tenant_memberships`, `tenant_membership_roles`, `whatsapp_accounts`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: Runtime/schema validation detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 550 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `lib/db/pool.ts`, `lib/provisioning/temples.ts`, `scripts/provision-temple.mts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 9 | 10 | 10 | 10 | 9 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → scripts/provision-temple.test.ts → lib/db/pool.ts / lib/provisioning/temples.ts / scripts/provision-temple.mts`

## Cross References

- [File Intelligence Index](../../README.md)
- [API Catalog](../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../06-Reference/Database-Catalog.md)
