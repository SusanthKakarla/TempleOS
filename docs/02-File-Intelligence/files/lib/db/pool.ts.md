# pool.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/db/pool.ts` |
| Layer | Database |
| Category | Repository |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Medium** |

## Purpose and Responsibilities

Repository in the **Database** area. It defines project behavior, structure, data, or configuration consumed by its dependents.

Public symbols: `getPool`.

## Actions Performed

- No database, session, external API, or HTTP side effect was detected statically.

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `pg`; environment: `DATABASE_URL`.
- Outputs: exports `getPool`.

## Dependencies

- Internal imports: None detected
- External imports: `pg`

## Database Usage

- Tables referenced: `devotees`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: environment variables only (DATABASE_URL)
- Rate limiting: Not implemented locally

## Performance

- File size: 39 lines; 0 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `lib/db/audit-log.ts`, `lib/db/campaign-analytics.ts`, `lib/db/campaign-audience.ts`, `lib/db/campaign-broadcasts.ts`, `lib/db/campaigns.ts`, `lib/db/devotee-families.ts`, `lib/db/devotees.ts`, `lib/db/donation-broadcasts.ts`, `lib/db/donations.test.ts`, `lib/db/donations.ts`, `lib/db/event-announcements.ts`, `lib/db/event-notifications.ts`, `lib/db/events.ts`, `lib/db/features.ts`, `lib/db/festival-greetings.ts`, `lib/db/notification-media.ts`, `lib/db/notification-preferences.ts`, `lib/db/notification-templates.test.ts`, `lib/db/notification-templates.ts`, `lib/db/notifications.test.ts`, `lib/db/notifications.ts`, `lib/db/persons.test.ts`, `lib/db/persons.ts`, `lib/db/platform-stats.ts`, `lib/db/role-definitions.test.ts`, `lib/db/role-definitions.ts`, `lib/db/super-admins.test.ts`, `lib/db/super-admins.ts`, `lib/db/temple-faqs.ts`, `lib/db/temple-sevas.ts`, `lib/db/temple-social-links.ts`, `lib/db/temple-special-days.ts`, `lib/db/tenant-domains.test.ts`, `lib/db/tenant-domains.ts`, `lib/db/tenant-features.ts`, `lib/db/tenant-memberships.test.ts`, `lib/db/tenant-memberships.ts`, `lib/db/tenant-notification-media.ts`, `lib/db/tenants.test.ts`, `lib/db/tenants.ts`, `lib/db/whatsapp-accounts.test.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/whatsapp-conversations.ts`, `lib/db/whatsapp-interactions.ts`, `lib/db/whatsapp-message-templates.test.ts`, `lib/db/whatsapp-message-templates.ts`, `lib/db/whatsapp-messages.ts`, `lib/provisioning/temples.test.ts`, `lib/provisioning/temples.ts`, `lib/provisioning/tenant-members.ts`, `lib/whatsapp/conversation-resolver.ts`, `scripts/clear-person-firebase-uid.mts`, `scripts/provision-temple.mts`, `scripts/provision-temple.test.ts`, `scripts/seed-super-admin.mts`, `scripts/seed.mts`
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

`Runtime/framework → lib/db/pool.ts → output or side effect`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
