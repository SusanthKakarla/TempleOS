# devotee-families.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/devotee-families.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, deletes records, uploads/processes media.

Public symbols: `FamilyMemberInput`, `CreateFamilyInput`, `UpdateFamilyMemberInput`, `UpdateFamilyInput`, `FamilyWithMembers`, `getFamilyById`, `getFamilyByName`, `getFamilyWithMembers`, `listFamiliesForTenant`, `countFamilies`, `deleteFamily`, `createFamilyWithMembers`, `updateFamilyWithMembers`, `addMembersToFamily`.

## Actions Performed

- Reads database
- Creates records
- Updates records
- Deletes records
- Uploads/processes media

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./pool`, `./devotees`, `@/types/db`.
- Outputs: exports `FamilyMemberInput`, `CreateFamilyInput`, `UpdateFamilyMemberInput`, `UpdateFamilyInput`, `FamilyWithMembers`, `getFamilyById`, `getFamilyByName`, `getFamilyWithMembers`, `listFamiliesForTenant`, `countFamilies`, `deleteFamily`, `createFamilyWithMembers`, `updateFamilyWithMembers`, `addMembersToFamily`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `lib/db/devotees.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `devotees`, `devotee_families`, `family_members`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 411 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/devotees/[id]/page.tsx`, `app/(dashboard)/dashboard/devotees/family/[familyId]/edit/page.tsx`, `app/api/devotees/families/[id]/route.ts`, `app/api/devotees/families/route.ts`, `app/api/devotees/import/commit/route.ts`
- Imports: `lib/db/pool.ts`, `lib/db/devotees.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Medium** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/db/devotee-families.ts → lib/db/pool.ts / lib/db/devotees.ts / types/db.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
