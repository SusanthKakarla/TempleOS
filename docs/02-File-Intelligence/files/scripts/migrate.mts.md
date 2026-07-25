# migrate.mts

## Basic Information

| Field | Value |
|---|---|
| Full path | `scripts/migrate.mts` |
| Layer | Operations |
| Category | Script/CLI |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Script/CLI in the **Operations** area. It reads database, creates records.

No statically detected named exports.

## Actions Performed

- Reads database
- Creates records

## Execution

- Trigger: Explicit CLI command
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./load-env.mts`, `node:fs`, `node:path`, `pg`; environment: `DATABASE_URL`.
- Outputs: side effects or static artifact.

## Dependencies

- Internal imports: `scripts/load-env.mts`
- External imports: `node:fs`, `node:path`, `pg`

## Database Usage

- Tables referenced: None detected
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: Runtime/schema validation detected
- Secrets: environment variables only (DATABASE_URL)
- Rate limiting: Not implemented locally

## Performance

- File size: 77 lines; 1 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `scripts/load-env.mts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Safe** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → scripts/migrate.mts → scripts/load-env.mts`

## Cross References

- [File Intelligence Index](../../README.md)
- [API Catalog](../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../06-Reference/Database-Catalog.md)
