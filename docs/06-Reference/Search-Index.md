# Search Index

| Question / concept | Start here |
|---|---|
| Where is Authentication? | lib/auth/, app/api/auth/, features/auth/ |
| Where is Repositories? | lib/db/ |
| Where is Migrations? | migrations/, scripts/migrate.mts |
| Where is Cron jobs? | app/api/cron/, lib/cron/ |
| Where is WhatsApp? | lib/whatsapp/, app/api/whatsapp/ |
| Where is Notification engine? | lib/notifications/engine.ts, lib/db/notifications.ts |
| Where is Event creation? | features/events/, app/api/events/, lib/db/events.ts |
| Where is CSV import? | features/devotees/*import*, features/users/*import*, app/api/*/import/ |
| Where is Image upload? | features/media/, app/api/media/upload/, lib/media/imagekit.ts |
| Where is Session management? | lib/auth/session.ts, lib/auth/super-admin-session.ts, lib/auth/session-token.ts |
| Where is Environment variables? | 06-Reference/Environment-Variables.md |
| Where is Tenant isolation? | lib/auth/session.ts and tenant-scoped lib/db repositories |

For exact parents, children, tables, environment variables, and risk, search `02-File-Intelligence/files/` by source path or symbol.
