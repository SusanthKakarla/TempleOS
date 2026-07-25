# super-admins.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/super-admins.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Critical** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, calls an external api.

Public symbols: `upsertFirstSuperAdmin`, `listActiveSuperAdmins`, `addSuperAdmin`, `deactivateSuperAdmin`, `findActiveSuperAdminByPhone`, `getSuperAdminById`, `bindSuperAdminFirebaseUid`.

## Actions Performed

- Reads database
- Creates records
- Updates records
- Calls an external API

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./pool`, `../phone.mts`, `@/types/db`.
- Outputs: exports `upsertFirstSuperAdmin`, `listActiveSuperAdmins`, `addSuperAdmin`, `deactivateSuperAdmin`, `findActiveSuperAdminByPhone`, `getSuperAdminById`, `bindSuperAdminFirebaseUid`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/phone.mts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `super_admins`, `persons`
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

- File size: 255 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(super-admin)/super-admin/(shell)/admins/page.tsx`, `app/api/super-admin/admins/[id]/route.ts`, `app/api/super-admin/admins/route.ts`, `app/api/super-admin/auth/session/route.test.ts`, `app/api/super-admin/auth/session/route.ts`, `lib/auth/super-admin-session.test.ts`, `lib/auth/super-admin-session.ts`, `lib/db/super-admins.test.ts`, `scripts/seed-super-admin.mts`, `scripts/seed.mts`
- Imports: `lib/db/pool.ts`, `lib/phone.mts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Critical** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 9 | 9 | 9 | 9 | 6 | 9 | 8 | 9 | 9 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/db/super-admins.ts → lib/db/pool.ts / lib/phone.mts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
