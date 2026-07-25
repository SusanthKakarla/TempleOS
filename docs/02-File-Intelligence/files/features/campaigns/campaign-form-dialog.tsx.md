# campaign-form-dialog.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/campaigns/campaign-form-dialog.tsx` |
| Layer | Campaigns |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Feature Component in the **Campaigns** area. It reads database, calls an external api.

Public symbols: `CampaignFormDialog`.

## Actions Performed

- Reads database
- Calls an external API

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next-intl`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/label`, `@/components/ui/labeled-input`, `@/components/ui/textarea`, `@/components/ui/select`, `@/types/db`.
- Outputs: exports `CampaignFormDialog`.

## Dependencies

- Internal imports: `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/label.tsx`, `components/ui/labeled-input.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `types/db.ts`
- External imports: `react`, `next-intl`

## Database Usage

- Tables referenced: `campaigns`
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

- File size: 234 lines; 7 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/campaigns/campaign-detail.tsx`, `features/campaigns/campaigns-table.tsx`
- Imports: `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/label.tsx`, `components/ui/labeled-input.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `types/db.ts`

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

`Runtime/framework → features/campaigns/campaign-form-dialog.tsx → components/ui/button.tsx / components/ui/dialog.tsx / components/ui/label.tsx / components/ui/labeled-input.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
