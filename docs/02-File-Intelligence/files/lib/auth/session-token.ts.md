# session-token.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/auth/session-token.ts` |
| Layer | Security |
| Category | Authentication/Authorization |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Authentication/Authorization in the **Security** area. It updates records, creates or validates sessions.

Public symbols: `createSignedSessionToken`, `verifySignedSessionToken`.

## Actions Performed

- Updates records
- Creates or validates sessions

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `node:crypto`; environment: `SESSION_SECRET`.
- Outputs: exports `createSignedSessionToken`, `verifySignedSessionToken`.

## Dependencies

- Internal imports: None detected
- External imports: `node:crypto`

## Database Usage

- Tables referenced: None detected
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: Runtime/schema validation detected
- Secrets: environment variables only (SESSION_SECRET)
- Rate limiting: Not implemented locally

## Performance

- File size: 58 lines; 0 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `lib/auth/session-token.test.ts`, `lib/auth/session.ts`, `lib/auth/super-admin-session.ts`, `lib/whatsapp/onboarding-handoff.ts`
- Imports: No internal modules

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

`Runtime/framework → lib/auth/session-token.ts → output or side effect`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
