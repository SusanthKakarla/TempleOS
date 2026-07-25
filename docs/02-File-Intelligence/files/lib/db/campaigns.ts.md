# campaigns.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/campaigns.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Repository in the **Database** area. It reads database, creates records, updates records, deletes records, processes notifications/messages.

Public symbols: `ListCampaignsFilter`, `listCampaigns`, `countCampaignsFiltered`, `listCampaignsByIds`, `getCampaignById`, `CreateCampaignInput`, `createCampaign`, `UpdateCampaignInput`, `updateCampaign`, `updateCampaignStatus`, `deleteCampaign`, `listDueCampaigns`.

## Actions Performed

- Reads database
- Creates records
- Updates records
- Deletes records
- Processes notifications/messages

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `./pool`, `@/types/db`, `@/lib/pagination`.
- Outputs: exports `ListCampaignsFilter`, `listCampaigns`, `countCampaignsFiltered`, `listCampaignsByIds`, `getCampaignById`, `CreateCampaignInput`, `createCampaign`, `UpdateCampaignInput`, `updateCampaign`, `updateCampaignStatus`, `deleteCampaign`, `listDueCampaigns`.

## Dependencies

- Internal imports: `lib/db/pool.ts`, `types/db.ts`, `lib/pagination.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `devotees`, `campaigns`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 310 lines; 3 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/campaigns/[id]/page.tsx`, `app/(dashboard)/dashboard/campaigns/page.tsx`, `app/api/campaigns/[id]/analytics/route.ts`, `app/api/campaigns/[id]/duplicate/route.ts`, `app/api/campaigns/[id]/route.ts`, `app/api/campaigns/[id]/schedule/route.ts`, `app/api/campaigns/[id]/send/route.ts`, `app/api/campaigns/[id]/status/route.ts`, `app/api/campaigns/export/route.ts`, `app/api/campaigns/route.ts`, `app/api/cron/process-campaign-schedules/route.ts`, `lib/campaigns/run-campaign.ts`
- Imports: `lib/db/pool.ts`, `types/db.ts`, `lib/pagination.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Medium** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/db/campaigns.ts → lib/db/pool.ts / types/db.ts / lib/pagination.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
