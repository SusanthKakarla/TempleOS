# whatsapp-templates-tab.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/chatbot-settings/whatsapp-templates-tab.tsx` |
| Layer | Chatbot Settings |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Feature Component in the **Chatbot Settings** area. It reads database, updates records, deletes records, calls an external api, processes notifications/messages.

Public symbols: `WhatsAppTemplatesTab`.

## Actions Performed

- Reads database
- Updates records
- Deletes records
- Calls an external API
- Processes notifications/messages

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `next/navigation`, `next-intl`, `lucide-react`, `@/types/db`, `./whatsapp-template-setup-wizard`, `@/components/ui/button`, `@/components/ui/badge`, `@/components/ui/switch`, `@/components/ui/input`, `@/components/ui/label`, `@/components/ui/textarea`, `@/components/ui/select`, `@/components/ui/dialog`, `@/components/ui/alert-dialog`, `@/components/overflow-action-menu`, `@/components/empty-state`, `@/components/mobile-list-view`, `@/components/mobile-list-row`, `@/components/ui/table`, `@/components/table-shell`.
- Outputs: exports `WhatsAppTemplatesTab`.

## Dependencies

- Internal imports: `types/db.ts`, `features/chatbot-settings/whatsapp-template-setup-wizard.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/switch.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`, `components/overflow-action-menu.tsx`, `components/empty-state.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`
- External imports: `react`, `next/navigation`, `next-intl`, `lucide-react`

## Database Usage

- Tables referenced: `notifications`
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

- File size: 530 lines; 17 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/chatbot-settings/chatbot-settings-tabs.tsx`
- Imports: `types/db.ts`, `features/chatbot-settings/whatsapp-template-setup-wizard.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/switch.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`, `components/overflow-action-menu.tsx`, `components/empty-state.tsx`, `components/mobile-list-view.tsx`, `components/mobile-list-row.tsx`, `components/ui/table.tsx`, `components/table-shell.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 7 | 6 | 7 | 7 | 7 | 7 | 8 | 7 | 7 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/chatbot-settings/whatsapp-templates-tab.tsx → types/db.ts / features/chatbot-settings/whatsapp-template-setup-wizard.tsx / components/ui/button.tsx / components/ui/badge.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
