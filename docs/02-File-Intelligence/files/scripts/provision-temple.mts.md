# provision-temple.mts

## Basic Information

| Field | Value |
|---|---|
| Full path | `scripts/provision-temple.mts` |
| Layer | Operations |
| Category | Script/CLI |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Script/CLI in the **Operations** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `CliArgs`, `parseCliArgs`, `buildProvisionTempleRawInput`, `buildProvisionTempleActor`, `runProvisionTempleCli`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: Explicit CLI command
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./load-env.mts`, `node:url`, `@/lib/db/pool`, `@/lib/provisioning/temples`.
- Outputs: exports `CliArgs`, `parseCliArgs`, `buildProvisionTempleRawInput`, `buildProvisionTempleActor`, `runProvisionTempleCli`.

## Dependencies

- Internal imports: `scripts/load-env.mts`, `lib/db/pool.ts`, `lib/provisioning/temples.ts`
- External imports: `node:url`

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

- File size: 273 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `scripts/provision-temple.test.ts`
- Imports: `scripts/load-env.mts`, `lib/db/pool.ts`, `lib/provisioning/temples.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Safe** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 9 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → scripts/provision-temple.mts → scripts/load-env.mts / lib/db/pool.ts / lib/provisioning/temples.ts`

## Cross References

- [File Intelligence Index](../../README.md)
- [API Catalog](../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../06-Reference/Database-Catalog.md)
