# generate-ekb.mjs

## Basic Information

| Field | Value |
|---|---|
| Full path | `scripts/generate-ekb.mjs` |
| Layer | Operations |
| Category | Script/CLI |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Script/CLI in the **Operations** area. It updates records, deletes records, calls an external api, creates or validates sessions, processes notifications/messages, uploads/processes media, returns an http response.

No statically detected named exports.

## Actions Performed

- Updates records
- Deletes records
- Calls an external API
- Creates or validates sessions
- Processes notifications/messages
- Uploads/processes media
- Returns an HTTP response

## Execution

- Trigger: Explicit CLI command
- HTTP methods: None

## Inputs and Outputs

- Inputs: file-local constants or runtime/framework inputs.
- Outputs: side effects or static artifact.

## Dependencies

- Internal imports: None detected
- External imports: None detected

## Database Usage

- Tables referenced: `tenants`, `persons`, `events`, `devotees`, `donations`, `notifications`, `features`, `campaigns`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Firebase Meta/WhatsApp ImageKit

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: Runtime/schema validation detected
- Secrets: none detected
- Rate limiting: Detected

## Performance

- File size: 774 lines; 0 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: No internal modules

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 7 | 8 | 8 | 8 | 7 | 8 | 7 | 8 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → scripts/generate-ekb.mjs → output or side effect`

## Cross References

- [File Intelligence Index](../../README.md)
- [API Catalog](../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../06-Reference/Database-Catalog.md)
