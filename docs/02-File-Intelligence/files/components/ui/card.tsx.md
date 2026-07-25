# card.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `components/ui/card.tsx` |
| Layer | Presentation |
| Category | Shared UI Component |
| Runtime | React (server/client determined by parent) |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

Shared UI Component in the **Presentation** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

No statically detected named exports.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `@/lib/utils`.
- Outputs: side effects or static artifact.

## Dependencies

- Internal imports: `lib/utils.ts`
- External imports: `react`

## Database Usage

- Tables referenced: None detected
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 104 lines; 1 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(auth)/access-denied/page.tsx`, `app/(dashboard)/dashboard/devotees/[id]/loading.tsx`, `app/(dashboard)/dashboard/devotees/[id]/page.tsx`, `app/(dashboard)/dashboard/loading.tsx`, `app/(super-admin)/super-admin/(shell)/page.tsx`, `app/whatsapp-onboarding/page.tsx`, `components/legal/legal-section.tsx`, `features/auth/tenant-login-form.tsx`, `features/campaigns/campaign-detail.tsx`, `features/chatbot-settings/contact-form.tsx`, `features/chatbot-settings/faqs-table.tsx`, `features/chatbot-settings/notification-preferences-form.tsx`, `features/chatbot-settings/sevas-table.tsx`, `features/chatbot-settings/social-links-form.tsx`, `features/chatbot-settings/special-days-table.tsx`, `features/chatbot-settings/temple-info-form.tsx`, `features/chatbot-settings/temple-timings-form.tsx`, `features/chatbot-settings/whatsapp-connection-card.tsx`, `features/dashboard/donations-chart.tsx`, `features/dashboard/metric-card.tsx`, `features/devotees/devotee-import-wizard.tsx`, `features/devotees/family-form-wizard.tsx`, `features/donations/devotee-donations-card.tsx`, `features/events/event-card.tsx`, `features/notifications/notification-preferences-form.tsx`, `features/super-admin/new-temple-form.tsx`, `features/super-admin/super-admin-login-form.tsx`, `features/super-admin/whatsapp-connection-form.tsx`, `features/users/user-import-wizard.tsx`, `features/whatsapp-onboarding/whatsapp-onboarding-flow.tsx`
- Imports: `lib/utils.ts`

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

`Runtime/framework → components/ui/card.tsx → lib/utils.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
