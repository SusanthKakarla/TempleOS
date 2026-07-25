# Folder: lib/db

## Purpose

The `lib/db/` folder belongs primarily to the **Database** area and groups 51 direct documented files.

## Responsibilities and Business Module

- Encapsulate Db behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`audit-log.ts`](../../files/lib/db/audit-log.ts.md)
- [`campaign-analytics.ts`](../../files/lib/db/campaign-analytics.ts.md)
- [`campaign-audience.ts`](../../files/lib/db/campaign-audience.ts.md)
- [`campaign-broadcasts.ts`](../../files/lib/db/campaign-broadcasts.ts.md)
- [`campaigns.ts`](../../files/lib/db/campaigns.ts.md)
- [`devotee-families.ts`](../../files/lib/db/devotee-families.ts.md)
- [`devotees.ts`](../../files/lib/db/devotees.ts.md)
- [`donation-broadcasts.ts`](../../files/lib/db/donation-broadcasts.ts.md)
- [`donations.test.ts`](../../files/lib/db/donations.test.ts.md)
- [`donations.ts`](../../files/lib/db/donations.ts.md)
- [`event-announcements.ts`](../../files/lib/db/event-announcements.ts.md)
- [`event-notifications.test.ts`](../../files/lib/db/event-notifications.test.ts.md)
- [`event-notifications.ts`](../../files/lib/db/event-notifications.ts.md)
- [`events.ts`](../../files/lib/db/events.ts.md)
- [`features.ts`](../../files/lib/db/features.ts.md)
- [`festival-greetings.ts`](../../files/lib/db/festival-greetings.ts.md)
- [`notification-media.ts`](../../files/lib/db/notification-media.ts.md)
- [`notification-preferences.ts`](../../files/lib/db/notification-preferences.ts.md)
- [`notification-templates.test.ts`](../../files/lib/db/notification-templates.test.ts.md)
- [`notification-templates.ts`](../../files/lib/db/notification-templates.ts.md)
- [`notifications.test.ts`](../../files/lib/db/notifications.test.ts.md)
- [`notifications.ts`](../../files/lib/db/notifications.ts.md)
- [`persons.test.ts`](../../files/lib/db/persons.test.ts.md)
- [`persons.ts`](../../files/lib/db/persons.ts.md)
- [`platform-stats.ts`](../../files/lib/db/platform-stats.ts.md)
- [`pool.ts`](../../files/lib/db/pool.ts.md)
- [`query-client.ts`](../../files/lib/db/query-client.ts.md)
- [`role-definitions.test.ts`](../../files/lib/db/role-definitions.test.ts.md)
- [`role-definitions.ts`](../../files/lib/db/role-definitions.ts.md)
- [`super-admins.test.ts`](../../files/lib/db/super-admins.test.ts.md)
- [`super-admins.ts`](../../files/lib/db/super-admins.ts.md)
- [`temple-faqs.ts`](../../files/lib/db/temple-faqs.ts.md)
- [`temple-sevas.ts`](../../files/lib/db/temple-sevas.ts.md)
- [`temple-social-links.ts`](../../files/lib/db/temple-social-links.ts.md)
- [`temple-special-days.ts`](../../files/lib/db/temple-special-days.ts.md)
- [`tenant-domains.test.ts`](../../files/lib/db/tenant-domains.test.ts.md)
- [`tenant-domains.ts`](../../files/lib/db/tenant-domains.ts.md)
- [`tenant-features.ts`](../../files/lib/db/tenant-features.ts.md)
- [`tenant-memberships.test.ts`](../../files/lib/db/tenant-memberships.test.ts.md)
- [`tenant-memberships.ts`](../../files/lib/db/tenant-memberships.ts.md)
- [`tenant-notification-media.ts`](../../files/lib/db/tenant-notification-media.ts.md)
- [`tenants.test.ts`](../../files/lib/db/tenants.test.ts.md)
- [`tenants.ts`](../../files/lib/db/tenants.ts.md)
- [`unique-violation.ts`](../../files/lib/db/unique-violation.ts.md)
- [`whatsapp-accounts.test.ts`](../../files/lib/db/whatsapp-accounts.test.ts.md)
- [`whatsapp-accounts.ts`](../../files/lib/db/whatsapp-accounts.ts.md)
- [`whatsapp-conversations.ts`](../../files/lib/db/whatsapp-conversations.ts.md)
- [`whatsapp-interactions.ts`](../../files/lib/db/whatsapp-interactions.ts.md)
- [`whatsapp-message-templates.test.ts`](../../files/lib/db/whatsapp-message-templates.test.ts.md)
- [`whatsapp-message-templates.ts`](../../files/lib/db/whatsapp-message-templates.ts.md)
- [`whatsapp-messages.ts`](../../files/lib/db/whatsapp-messages.ts.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
