# db.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `types/db.ts` |
| Layer | types |
| Category | Asset |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Asset in the **types** area. It creates records, deletes records, calls an external api, processes notifications/messages.

Public symbols: `TENANT_STATUSES`, `TenantStatus`, `Tenant`, `AuditLogEntry`, `REAL_FEATURE_KEYS`, `RealFeatureKey`, `BUNDLED_FEATURE_KEYS`, `BundledFeatureKey`, `COMING_SOON_FEATURE_KEYS`, `ComingSoonFeatureKey`, `FeatureKey`, `FeatureCategory`, `Feature`, `TenantFeature`, `SuperAdmin`, `Person`, `TenantDomainKind`, `TenantDomainStatus`, `TenantDomain`, `ROLE_CODES`, `RoleCode`, `isRoleCode`, `RoleDefinition`, `TenantMembershipStatus`, `TenantMembership`, `TenantMembershipRole`, `WhatsAppAccountStatus`, `WhatsAppAccount`, `WhatsAppTemplateApprovalStatus`, `WhatsAppTemplateMetaCategory`, `WhatsAppMessageTemplate`, `SupportedLanguage`, `EventStatus`, `Event`, `EventNotificationType`, `EventNotificationDeliveryStatus`, `EventNotification`, `NotificationChannel`, `NotificationDeliveryStatus`, `NotificationCategory`, `NotificationType`, `NotificationTemplate`, `Notification`, `NOTIFICATION_MEDIA_CATEGORIES`, `NotificationMediaCategory`, `NotificationMedia`, `CAMPAIGN_STATUSES`, `CampaignStatus`, `CAMPAIGN_TYPES`, `CampaignType`, `CampaignScheduleType`, `CampaignAudienceFilter`, `Campaign`, `TenantNotificationMedia`, `NotificationPreference`, `GENDER_OPTIONS`, `Gender`, `MARITAL_STATUS_OPTIONS`, `MaritalStatus`, `RELATIONSHIP_CODES`, `RelationshipCode`, `isRelationshipCode`, `Devotee`, `DevoteeFamily`, `FamilyMember`, `MessageDirection`, `MessageStatus`, `WhatsAppMessageType`, `WhatsAppMessage`, `WhatsAppConversation`, `ConversationSummary`, `WhatsAppStats`, `InteractionType`, `WhatsAppInteraction`, `PaymentMethod`, `Donation`, `DonationWithDonor`, `DonationSummary`, `TempleSpecialDay`, `DayOfWeek`, `TempleSeva`, `TempleFaq`, `SocialPlatform`, `TempleSocialLink`.

## Actions Performed

- Creates records
- Deletes records
- Calls an external API
- Processes notifications/messages

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: file-local constants or runtime/framework inputs.
- Outputs: exports `TENANT_STATUSES`, `TenantStatus`, `Tenant`, `AuditLogEntry`, `REAL_FEATURE_KEYS`, `RealFeatureKey`, `BUNDLED_FEATURE_KEYS`, `BundledFeatureKey`, `COMING_SOON_FEATURE_KEYS`, `ComingSoonFeatureKey`, `FeatureKey`, `FeatureCategory`, `Feature`, `TenantFeature`, `SuperAdmin`, `Person`, `TenantDomainKind`, `TenantDomainStatus`, `TenantDomain`, `ROLE_CODES`, `RoleCode`, `isRoleCode`, `RoleDefinition`, `TenantMembershipStatus`, `TenantMembership`, `TenantMembershipRole`, `WhatsAppAccountStatus`, `WhatsAppAccount`, `WhatsAppTemplateApprovalStatus`, `WhatsAppTemplateMetaCategory`, `WhatsAppMessageTemplate`, `SupportedLanguage`, `EventStatus`, `Event`, `EventNotificationType`, `EventNotificationDeliveryStatus`, `EventNotification`, `NotificationChannel`, `NotificationDeliveryStatus`, `NotificationCategory`, `NotificationType`, `NotificationTemplate`, `Notification`, `NOTIFICATION_MEDIA_CATEGORIES`, `NotificationMediaCategory`, `NotificationMedia`, `CAMPAIGN_STATUSES`, `CampaignStatus`, `CAMPAIGN_TYPES`, `CampaignType`, `CampaignScheduleType`, `CampaignAudienceFilter`, `Campaign`, `TenantNotificationMedia`, `NotificationPreference`, `GENDER_OPTIONS`, `Gender`, `MARITAL_STATUS_OPTIONS`, `MaritalStatus`, `RELATIONSHIP_CODES`, `RelationshipCode`, `isRelationshipCode`, `Devotee`, `DevoteeFamily`, `FamilyMember`, `MessageDirection`, `MessageStatus`, `WhatsAppMessageType`, `WhatsAppMessage`, `WhatsAppConversation`, `ConversationSummary`, `WhatsAppStats`, `InteractionType`, `WhatsAppInteraction`, `PaymentMethod`, `Donation`, `DonationWithDonor`, `DonationSummary`, `TempleSpecialDay`, `DayOfWeek`, `TempleSeva`, `TempleFaq`, `SocialPlatform`, `TempleSocialLink`.

## Dependencies

- Internal imports: None detected
- External imports: None detected

## Database Usage

- Tables referenced: `tenants`, `events`, `devotees`, `donations`, `notifications`, `devotee_families`, `campaigns`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Firebase Meta/WhatsApp 

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 754 lines; 0 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/campaigns/page.tsx`, `app/(dashboard)/dashboard/chatbot-settings/page.tsx`, `app/(dashboard)/dashboard/devotees/[id]/page.tsx`, `app/(dashboard)/dashboard/events/page.tsx`, `app/(dashboard)/dashboard/notification-preferences/page.tsx`, `app/(dashboard)/dashboard/users/page.tsx`, `app/(super-admin)/super-admin/(shell)/roles/page.tsx`, `app/(super-admin)/super-admin/require-super-admin.ts`, `app/api/campaigns/[id]/route.ts`, `app/api/campaigns/route.ts`, `app/api/cron/daily-birthday-check/route.ts`, `app/api/devotees/import/commit/route.ts`, `app/api/identity-session-isolation.test.ts`, `app/api/media/upload/route.ts`, `app/api/notification-preferences/route.ts`, `app/api/super-admin/temples/[tenantId]/features/route.ts`, `app/api/super-admin/temples/[tenantId]/status/route.ts`, `app/api/users/[membershipId]/roles/route.ts`, `app/api/users/export/route.ts`, `app/api/users/import/commit/route.ts`, `app/api/users/route.ts`, `app/api/whatsapp/webhook/route.ts`, `features/campaigns/campaign-detail.tsx`, `features/campaigns/campaign-form-dialog.tsx`, `features/campaigns/campaigns-table.tsx`, `features/chatbot-settings/chatbot-settings-tabs.tsx`, `features/chatbot-settings/contact-form.tsx`, `features/chatbot-settings/faq-form-dialog.tsx`, `features/chatbot-settings/faqs-table.tsx`, `features/chatbot-settings/notification-preferences-form.tsx`, `features/chatbot-settings/notification-settings-content.tsx`, `features/chatbot-settings/seva-form-dialog.tsx`, `features/chatbot-settings/sevas-table.tsx`, `features/chatbot-settings/social-links-form.tsx`, `features/chatbot-settings/special-day-form-dialog.tsx`, `features/chatbot-settings/special-days-table.tsx`, `features/chatbot-settings/temple-info-form.tsx`, `features/chatbot-settings/temple-timings-form.tsx`, `features/chatbot-settings/whatsapp-connection-card.tsx`, `features/chatbot-settings/whatsapp-templates-tab.tsx`, `features/dashboard/donations-chart.tsx`, `features/dashboard/language-switcher.tsx`, `features/devotees/devotee-form-dialog.tsx`, `features/devotees/devotees-table.tsx`, `features/devotees/family-form-wizard.tsx`, `features/donations/devotee-donations-card.tsx`, `features/donations/donation-form-dialog.tsx`, `features/donations/donations-table.tsx`, `features/events/announce-dialog.tsx`, `features/events/date-time-field.tsx`, `features/events/event-card.tsx`, `features/events/event-form-dialog.tsx`, `features/events/events-table.tsx`, `features/media/festival-media-grid.tsx`, `features/media/greeting-media-card.tsx`, `features/media/media-upload.tsx`, `features/notifications/automated-notification-list.tsx`, `features/notifications/notification-detail-drawer.tsx`, `features/notifications/notification-preferences-form.tsx`, `features/super-admin/admins-list.tsx`, `features/super-admin/member-role-editor-helpers.ts`, `features/super-admin/member-role-editor.tsx`, `features/super-admin/new-temple-form-helpers.test.ts`, `features/super-admin/new-temple-form-helpers.ts`, `features/super-admin/new-temple-form.tsx`, `features/super-admin/super-admin-shell.tsx`, `features/super-admin/temple-detail-edit-form.tsx`, `features/super-admin/tenant-status-control.tsx`, `features/super-admin/whatsapp-connection-form.tsx`, `features/users/activity-log-table.tsx`, `features/users/change-role-dialog.tsx`, `features/users/edit-user-dialog.tsx`, `features/users/invite-user-dialog.tsx`, `features/users/user-activity-panel.tsx`, `features/users/users-table.tsx`, `lib/auth/features.ts`, `lib/auth/session-live.test.ts`, `lib/auth/session.test.ts`, `lib/auth/session.ts`, `lib/auth/super-admin-session.ts`, `lib/campaigns/lifecycle.ts`, `lib/campaigns/run-campaign.ts`, `lib/date.ts`, `lib/db/audit-log.ts`, `lib/db/campaign-audience.ts`, `lib/db/campaign-broadcasts.ts`, `lib/db/campaigns.ts`, `lib/db/devotee-families.ts`, `lib/db/devotees.ts`, `lib/db/donation-broadcasts.ts`, `lib/db/donations.ts`, `lib/db/event-announcements.ts`, `lib/db/event-notifications.ts`, `lib/db/events.ts`, `lib/db/features.ts`, `lib/db/festival-greetings.ts`, `lib/db/notification-media.ts`, `lib/db/notification-preferences.ts`, `lib/db/notification-templates.ts`, `lib/db/notifications.ts`, `lib/db/persons.ts`, `lib/db/platform-stats.ts`, `lib/db/role-definitions.ts`, `lib/db/super-admins.ts`, `lib/db/temple-faqs.ts`, `lib/db/temple-sevas.ts`, `lib/db/temple-social-links.ts`, `lib/db/temple-special-days.ts`, `lib/db/tenant-domains.ts`, `lib/db/tenant-features.ts`, `lib/db/tenant-memberships.ts`, `lib/db/tenant-notification-media.ts`, `lib/db/tenants.ts`, `lib/db/whatsapp-accounts.ts`, `lib/db/whatsapp-conversations.ts`, `lib/db/whatsapp-interactions.ts`, `lib/db/whatsapp-message-templates.ts`, `lib/db/whatsapp-messages.ts`, `lib/events/notification-policy.test.ts`, `lib/events/notification-policy.ts`, `lib/export/columns/campaigns.ts`, `lib/export/columns/devotees.test.ts`, `lib/export/columns/devotees.ts`, `lib/export/columns/donations.test.ts`, `lib/export/columns/donations.ts`, `lib/export/columns/events.test.ts`, `lib/export/columns/events.ts`, `lib/export/columns/whatsapp-thread.test.ts`, `lib/export/columns/whatsapp-thread.ts`, `lib/i18n/locale.ts`, `lib/notifications/delivery.ts`, `lib/notifications/engine.ts`, `lib/provisioning/temples.ts`, `lib/provisioning/tenant-members.ts`, `lib/validation/campaigns.ts`, `lib/validation/devotee-families.ts`, `lib/validation/devotee-import.ts`, `lib/validation/devotees.ts`, `lib/validation/user-import.ts`, `lib/whatsapp/delivery-logger.ts`, `lib/whatsapp/delivery-strategy.ts`, `lib/whatsapp/i18n.ts`, `lib/whatsapp/message-type.ts`, `lib/whatsapp/router.ts`, `lib/whatsapp/standard-template-catalog.ts`, `lib/whatsapp/template-client.ts`, `lib/whatsapp/template-registry.ts`, `lib/whatsapp/template-sync.ts`, `lib/whatsapp/template-validator.ts`, `lib/whatsapp/templates.test.ts`, `lib/whatsapp/templates.ts`
- Imports: No internal modules

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 7 | 8 | 8 | 8 | 9 | 8 | 9 | 8 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → types/db.ts → output or side effect`

## Cross References

- [File Intelligence Index](../../README.md)
- [API Catalog](../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../06-Reference/Database-Catalog.md)
