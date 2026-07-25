# persons.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/persons.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, calls an external api.

Public symbols: `findOrCreatePersonByPhoneForProvisioning`, `findPersonByPhone`, `getPersonById`, `bindPersonFirebaseUid`, `clearPersonFirebaseUidByPhone`.

## Actions Performed

- Reads database
- Creates records
- Updates records
- Calls an external API

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `./pool`, `./query-client`, `@/lib/phone.mts`, `@/types/db`.
- Outputs: exports `findOrCreatePersonByPhoneForProvisioning`, `findPersonByPhone`, `getPersonById`, `bindPersonFirebaseUid`, `clearPersonFirebaseUidByPhone`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `lib/phone.mts`, `types/db.ts`
- External imports: `react`

## Database Usage

- Tables referenced: `persons`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Firebase 

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 103 lines; 4 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/auth/session/route.test.ts`, `app/api/auth/session/route.ts`, `lib/db/persons.test.ts`, `lib/notifications/delivery.ts`, `lib/provisioning/temples.test.ts`, `lib/provisioning/temples.ts`, `lib/provisioning/tenant-members.ts`, `scripts/clear-person-firebase-uid.mts`
- Imports: `lib/db/pool.ts`, `lib/db/query-client.ts`, `lib/phone.mts`, `types/db.ts`

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

`Runtime/framework → lib/db/persons.ts → lib/db/pool.ts / lib/db/query-client.ts / lib/phone.mts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
