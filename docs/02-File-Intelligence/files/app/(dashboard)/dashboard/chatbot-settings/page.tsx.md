# page.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `app/(dashboard)/dashboard/chatbot-settings/page.tsx` |
| Layer | Presentation |
| Category | Page |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Page in the **Presentation** area. It processes notifications/messages.

Public symbols: `ChatbotSettingsPage`.

## Actions Performed

- Processes notifications/messages

## Execution

- Trigger: Server rendering and page navigation
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `next-intl/server`, `lucide-react`, `../require-dashboard-admin`, `@/lib/auth/features`, `@/lib/db/tenant-features`, `@/lib/db/tenants`, `@/lib/db/temple-special-days`, `@/lib/db/temple-sevas`, `@/lib/db/temple-faqs`, `@/lib/db/temple-social-links`, `@/lib/db/whatsapp-accounts`, `@/lib/db/notifications`, `@/lib/db/tenant-notification-media`, `@/lib/db/notification-media`, `@/lib/db/whatsapp-message-templates`, `@/features/chatbot-settings/chatbot-settings-tabs`, `@/features/chatbot-settings/notification-settings-content`, `@/features/notifications/automated-notification-list`, `@/features/chatbot-settings/whatsapp-connection-card`, `@/features/chatbot-settings/settings-section`, `@/lib/whatsapp/onboarding-handoff`, `@/components/page-header`, `@/lib/pagination`, `@/types/db`.
- Outputs: exports `ChatbotSettingsPage`.

## Dependencies

- Internal imports: `app/(dashboard)/dashboard/require-dashboard-admin.ts`, `lib/auth/features.ts`, `lib/db/tenant-features.ts`, `lib/db/tenants.ts`, `lib/db/temple-special-days.ts`, `lib/db/temple-sevas.ts`, `lib/db/temple-faqs.ts`, `lib/db/temple-social-links.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/notifications.ts`, `lib/db/tenant-notification-media.ts`, `lib/db/notification-media.ts`, `lib/db/whatsapp-message-templates.ts`, `features/chatbot-settings/chatbot-settings-tabs.tsx`, `features/chatbot-settings/notification-settings-content.tsx`, `features/notifications/automated-notification-list.tsx`, `features/chatbot-settings/whatsapp-connection-card.tsx`, `features/chatbot-settings/settings-section.tsx`, `lib/whatsapp/onboarding-handoff.ts`, `components/page-header.tsx`, `lib/pagination.ts`, `types/db.ts`
- External imports: `next-intl/server`, `lucide-react`

## Database Usage

- Tables referenced: `tenants`, `notifications`, `features`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 188 lines; 22 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: `app/(dashboard)/dashboard/require-dashboard-admin.ts`, `lib/auth/features.ts`, `lib/db/tenant-features.ts`, `lib/db/tenants.ts`, `lib/db/temple-special-days.ts`, `lib/db/temple-sevas.ts`, `lib/db/temple-faqs.ts`, `lib/db/temple-social-links.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/notifications.ts`, `lib/db/tenant-notification-media.ts`, `lib/db/notification-media.ts`, `lib/db/whatsapp-message-templates.ts`, `features/chatbot-settings/chatbot-settings-tabs.tsx`, `features/chatbot-settings/notification-settings-content.tsx`, `features/notifications/automated-notification-list.tsx`, `features/chatbot-settings/whatsapp-connection-card.tsx`, `features/chatbot-settings/settings-section.tsx`, `lib/whatsapp/onboarding-handoff.ts`, `components/page-header.tsx`, `lib/pagination.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 9 | 9 | 9 | 9 | 9 | 7 | 8 | 7 | 9 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → app/(dashboard)/dashboard/chatbot-settings/page.tsx → app/(dashboard)/dashboard/require-dashboard-admin.ts / lib/auth/features.ts / lib/db/tenant-features.ts / lib/db/tenants.ts`

## Cross References

- [File Intelligence Index](../../../../../README.md)
- [API Catalog](../../../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../../../06-Reference/Database-Catalog.md)
