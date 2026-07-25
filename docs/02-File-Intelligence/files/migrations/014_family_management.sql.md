# 014_family_management.sql

## Basic Information

| Field | Value |
|---|---|
| Full path | `migrations/014_family_management.sql` |
| Layer | Database |
| Category | Migration |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Migration in the **Database** area. It deletes records, processes notifications/messages.

No statically detected named exports.

## Actions Performed

- Deletes records
- Processes notifications/messages

## Execution

- Trigger: Deployment or explicit migration command
- HTTP methods: None

## Inputs and Outputs

- Inputs: file-local constants or runtime/framework inputs.
- Outputs: side effects or static artifact.

## Dependencies

- Internal imports: None detected
- External imports: None detected

## Database Usage

- Tables referenced: `tenants`, `devotees`, `notifications`, `devotee_families`, `family_members`
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

- File size: 48 lines; 0 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: No internal modules

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Medium** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 7 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → migrations/014_family_management.sql → output or side effect`

## Cross References

- [File Intelligence Index](../../README.md)
- [API Catalog](../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../06-Reference/Database-Catalog.md)
