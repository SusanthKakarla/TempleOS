# Folder: migrations

## Purpose

The `migrations/` folder belongs primarily to the **Database** area and groups 25 direct documented files.

## Responsibilities and Business Module

- Encapsulate Migrations behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`001_initial_schema.sql`](../files/migrations/001_initial_schema.sql.md)
- [`002_seed_pilot_tenant.sql`](../files/migrations/002_seed_pilot_tenant.sql.md)
- [`003_admin_roles.sql`](../files/migrations/003_admin_roles.sql.md)
- [`004_donations.sql`](../files/migrations/004_donations.sql.md)
- [`005_chatbot_settings.sql`](../files/migrations/005_chatbot_settings.sql.md)
- [`006_language_support.sql`](../files/migrations/006_language_support.sql.md)
- [`006_super_admin_provisioning.sql`](../files/migrations/006_super_admin_provisioning.sql.md)
- [`007_event_notifications.sql`](../files/migrations/007_event_notifications.sql.md)
- [`008_whatsapp_conversations.sql`](../files/migrations/008_whatsapp_conversations.sql.md)
- [`009_dashboard_locale.sql`](../files/migrations/009_dashboard_locale.sql.md)
- [`010_tenant_membership_last_login.sql`](../files/migrations/010_tenant_membership_last_login.sql.md)
- [`011_super_admin_person_identity.sql`](../files/migrations/011_super_admin_person_identity.sql.md)
- [`012_whatsapp_embedded_signup.sql`](../files/migrations/012_whatsapp_embedded_signup.sql.md)
- [`013_notification_engine.sql`](../files/migrations/013_notification_engine.sql.md)
- [`014_family_management.sql`](../files/migrations/014_family_management.sql.md)
- [`014_whatsapp_account_uniqueness.sql`](../files/migrations/014_whatsapp_account_uniqueness.sql.md)
- [`015_feature_access.sql`](../files/migrations/015_feature_access.sql.md)
- [`015_whatsapp_webhook_error_tracking.sql`](../files/migrations/015_whatsapp_webhook_error_tracking.sql.md)
- [`016_notification_media.sql`](../files/migrations/016_notification_media.sql.md)
- [`017_notification_delivery_tracking.sql`](../files/migrations/017_notification_delivery_tracking.sql.md)
- [`018_devotee_lifecycle.sql`](../files/migrations/018_devotee_lifecycle.sql.md)
- [`019_whatsapp_message_templates.sql`](../files/migrations/019_whatsapp_message_templates.sql.md)
- [`020_whatsapp_template_submission_guide.sql`](../files/migrations/020_whatsapp_template_submission_guide.sql.md)
- [`021_campaigns.sql`](../files/migrations/021_campaigns.sql.md)
- [`identity-schema.test.ts`](../files/migrations/identity-schema.test.ts.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
