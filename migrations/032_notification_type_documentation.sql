-- Documentation only, no schema change. notification_type/category are
-- deliberately plain TEXT with no CHECK/native ENUM: the list of automated
-- notification types is expected to keep growing, and a DB enum would need a
-- migration for every future addition. Type safety is enforced in the
-- application layer instead — see NotificationType/NotificationCategory in
-- types/db.ts, which is the source of truth for valid values.
COMMENT ON COLUMN notifications.notification_type IS
  'Application-enforced enum — see NotificationType in types/db.ts. Deliberately not a DB CHECK/ENUM; this list grows often.';
COMMENT ON COLUMN notifications.category IS
  'Application-enforced enum — see NotificationCategory in types/db.ts.';
COMMENT ON COLUMN notification_templates.notification_type IS
  'Application-enforced enum — see NotificationType in types/db.ts.';
COMMENT ON COLUMN tenant_notification_media.notification_type IS
  'Application-enforced enum — see NotificationType in types/db.ts. Only types in LINKABLE_NOTIFICATION_TYPES (app/api/notification-media/link/route.ts) are ever linked here.';
