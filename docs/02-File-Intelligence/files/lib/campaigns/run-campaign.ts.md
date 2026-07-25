# run-campaign.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/campaigns/run-campaign.ts` |
| Layer | lib |
| Category | Service/Utility |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Service/Utility in the **lib** area. It processes notifications/messages.

Public symbols: `RunCampaignResult`, `runCampaignNow`.

## Actions Performed

- Processes notifications/messages

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `@/lib/db/campaign-broadcasts`, `@/lib/notifications/delivery`, `@/lib/db/campaigns`, `@/lib/db/campaign-analytics`, `./recurrence`, `@/types/db`.
- Outputs: exports `RunCampaignResult`, `runCampaignNow`.

## Dependencies

- Internal imports: `lib/db/campaign-broadcasts.ts`, `lib/notifications/delivery.ts`, `lib/db/campaigns.ts`, `lib/db/campaign-analytics.ts`, `lib/campaigns/recurrence.ts`, `types/db.ts`
- External imports: None detected

## Database Usage

- Tables referenced: `notifications`, `campaigns`
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

- File size: 44 lines; 6 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/api/campaigns/[id]/send/route.ts`, `app/api/cron/process-campaign-schedules/route.ts`
- Imports: `lib/db/campaign-broadcasts.ts`, `lib/notifications/delivery.ts`, `lib/db/campaigns.ts`, `lib/db/campaign-analytics.ts`, `lib/campaigns/recurrence.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Safe** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/campaigns/run-campaign.ts → lib/db/campaign-broadcasts.ts / lib/notifications/delivery.ts / lib/db/campaigns.ts / lib/db/campaign-analytics.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
