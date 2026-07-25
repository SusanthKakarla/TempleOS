# API Catalog

Generated from all Next.js route modules. Request/response details live in the linked per-file records under File Intelligence.

| Route | Methods | Authentication | Validation | Direct table indicators |
|---|---|---|---|---|
| `/api/account/locale` | POST | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/admins/[id]` | PATCH, DELETE | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/admins` | GET, POST | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/audit-log` | GET | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/auth/session` | POST, DELETE | Firebase/session boundary | Schema/runtime | persons |
| `/api/auth/tenant-context` | GET | Firebase/session boundary | Manual/framework | tenants |
| `/api/campaigns/[id]/analytics` | GET | Public/retired—inspect route | Manual/framework | donations, notifications, features, campaigns |
| `/api/campaigns/[id]/duplicate` | POST | Public/retired—inspect route | Manual/framework | features, campaigns |
| `/api/campaigns/[id]` | GET, PATCH, DELETE | Public/retired—inspect route | Schema/runtime | features, campaigns |
| `/api/campaigns/[id]/schedule` | POST | Public/retired—inspect route | Schema/runtime | features, campaigns |
| `/api/campaigns/[id]/send` | POST | Public/retired—inspect route | Manual/framework | tenants, events, features, campaigns |
| `/api/campaigns/[id]/status` | PUT | Public/retired—inspect route | Schema/runtime | features, campaigns |
| `/api/campaigns/audience-preview` | POST | Public/retired—inspect route | Schema/runtime | features, campaigns |
| `/api/campaigns/export` | GET, POST | Public/retired—inspect route | Schema/runtime | tenants, features, campaigns |
| `/api/campaigns` | GET, POST | Public/retired—inspect route | Schema/runtime | features, campaigns |
| `/api/cron/daily-birthday-check` | POST | Cron bearer secret | Manual/framework | tenants, events, devotees, notifications |
| `/api/cron/process-campaign-schedules` | POST | Cron bearer secret | Manual/framework | tenants, notifications, campaigns |
| `/api/cron/process-event-notifications` | POST | Cron bearer secret | Manual/framework | events, event_notifications, notifications |
| `/api/cron/process-notifications` | POST | Cron bearer secret | Manual/framework | notifications |
| `/api/cron/sync-whatsapp-templates` | POST | Cron bearer secret | Manual/framework | Via imported repositories |
| `/api/devotees/[id]/donations` | GET | Public/retired—inspect route | Manual/framework | donations |
| `/api/devotees/[id]` | PATCH, DELETE | Public/retired—inspect route | Schema/runtime | devotees, notifications |
| `/api/devotees/[id]/status` | PUT | Public/retired—inspect route | Schema/runtime | devotees |
| `/api/devotees/export` | GET, POST | Public/retired—inspect route | Schema/runtime | tenants, devotees |
| `/api/devotees/families/[id]` | GET, PATCH, DELETE | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/devotees/families` | GET, POST | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/devotees/import/commit` | POST | Public/retired—inspect route | Schema/runtime | devotees |
| `/api/devotees/import/preview` | POST | Public/retired—inspect route | Manual/framework | devotees |
| `/api/devotees/import/template` | GET | Public/retired—inspect route | Manual/framework | tenants, devotees |
| `/api/devotees` | GET, POST | Public/retired—inspect route | Schema/runtime | events, devotees, notifications, features |
| `/api/donations/[id]` | PATCH, DELETE | Public/retired—inspect route | Schema/runtime | donations |
| `/api/donations/export` | GET, POST | Public/retired—inspect route | Schema/runtime | tenants, donations |
| `/api/donations` | GET, POST | Public/retired—inspect route | Schema/runtime | tenants, devotees, donations, notifications, features |
| `/api/events/[id]/announce` | POST | Public/retired—inspect route | Manual/framework | tenants, events, notifications, features |
| `/api/events/[id]` | PATCH, DELETE | Public/retired—inspect route | Schema/runtime | tenants, events, notifications |
| `/api/events/export` | GET, POST | Public/retired—inspect route | Schema/runtime | tenants, events |
| `/api/events` | GET, POST | Public/retired—inspect route | Schema/runtime | tenants, events, notifications, features |
| `/api/media/[id]` | GET, DELETE | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/media/upload` | POST | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/notification-media/[id]/send-festival-greeting` | POST | Public/retired—inspect route | Manual/framework | tenants, notifications |
| `/api/notification-media/link` | PUT, DELETE | Public/retired—inspect route | Schema/runtime | events |
| `/api/notification-preferences` | GET, PUT | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/super-admin/admins/[id]` | PUT | Super admin | Schema/runtime | Via imported repositories |
| `/api/super-admin/admins` | GET, POST | Super admin | Schema/runtime | Via imported repositories |
| `/api/super-admin/auth/session` | POST, DELETE | Firebase/session boundary | Schema/runtime | Via imported repositories |
| `/api/super-admin/me` | GET | Super admin | Manual/framework | Via imported repositories |
| `/api/super-admin/roles` | GET, POST | Super admin | Manual/framework | Via imported repositories |
| `/api/super-admin/temples/[tenantId]/features` | GET, PATCH | Super admin | Schema/runtime | tenants, notifications, features |
| `/api/super-admin/temples/[tenantId]/members/[membershipId]/roles` | PUT | Super admin | Manual/framework | Via imported repositories |
| `/api/super-admin/temples/[tenantId]` | GET, PATCH | Super admin | Manual/framework | tenants, notifications |
| `/api/super-admin/temples/[tenantId]/status` | PATCH | Super admin | Schema/runtime | tenants, notifications |
| `/api/super-admin/temples/[tenantId]/whatsapp` | PUT, DELETE | Super admin | Schema/runtime | tenants, whatsapp_accounts, events, audit_log |
| `/api/super-admin/temples` | GET, POST | Super admin | Manual/framework | tenants |
| `/api/temple-faqs/[id]` | PATCH, DELETE | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/temple-faqs` | POST | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/temple-sevas/[id]` | PATCH, DELETE | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/temple-sevas` | POST | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/temple-social-links/[platform]` | PUT, DELETE | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/temple-special-days/[id]` | PATCH, DELETE | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/temple-special-days` | POST | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/tenant` | PATCH | Public/retired—inspect route | Schema/runtime | tenants |
| `/api/users/[membershipId]/activity` | GET | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/users/[membershipId]/roles` | PUT | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/users/[membershipId]` | PATCH, DELETE | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/users/[membershipId]/status` | PUT | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/users/export` | GET, POST | Public/retired—inspect route | Schema/runtime | tenants |
| `/api/users/import/commit` | POST | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/users/import/preview` | POST | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/users/import/template` | GET | Public/retired—inspect route | Manual/framework | tenants |
| `/api/users` | GET, POST | Public/retired—inspect route | Manual/framework | tenants, events, notifications, features |
| `/api/whatsapp/connect/callback` | POST | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/whatsapp/connect/start` | POST | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/whatsapp/disconnect` | POST | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/whatsapp/onboarding/complete` | POST | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/whatsapp/templates/[id]` | PATCH, DELETE | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/whatsapp/templates/[id]/sync` | POST | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/whatsapp/templates/[id]/test-send` | POST | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/whatsapp/templates` | GET, POST | Public/retired—inspect route | Schema/runtime | Via imported repositories |
| `/api/whatsapp/templates/setup` | POST | Public/retired—inspect route | Manual/framework | Via imported repositories |
| `/api/whatsapp/webhook` | GET, POST | Meta webhook verification (GET); POST signature not detected | Manual/framework | tenants, events, devotees, notifications |

## API Standards

- Resolve tenant identity server-side and pass `tenantId` into every tenant repository operation.
- Validate untrusted bodies before persistence and return stable JSON error shapes.
- Authenticate cron routes with `isAuthorizedCronRequest`; authenticate platform operations with `requireSuperAdmin`.
- Verify third-party webhook signatures before accepting side effects.
