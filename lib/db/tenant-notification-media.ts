import { getPool } from "./pool";
import { createAuditLogEntry } from "./audit-log";
import type { NotificationType } from "@/types/db";

interface TenantNotificationMediaRow {
  media_id: string;
}

/** Resolves the reusable image (if any) a tenant has attached to an automated notification type. */
export async function getTenantMediaIdForType(
  tenantId: string,
  notificationType: NotificationType,
): Promise<string | null> {
  const { rows } = await getPool().query<TenantNotificationMediaRow>(
    "SELECT media_id FROM tenant_notification_media WHERE tenant_id = $1 AND notification_type = $2",
    [tenantId, notificationType],
  );
  return rows[0]?.media_id ?? null;
}

export async function setTenantMediaForType(
  tenantId: string,
  notificationType: NotificationType,
  mediaId: string,
  actorId: string,
): Promise<void> {
  await getPool().query(
    `INSERT INTO tenant_notification_media (tenant_id, notification_type, media_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, notification_type)
     DO UPDATE SET media_id = EXCLUDED.media_id, updated_at = now()`,
    [tenantId, notificationType, mediaId],
  );

  await createAuditLogEntry({
    actorType: "tenant_member",
    actorId,
    tenantId,
    action: "notification_media.linked",
    targetType: "tenant_notification_media",
    targetId: mediaId,
    metadata: { notificationType, mediaId },
  });
}

export async function clearTenantMediaForType(
  tenantId: string,
  notificationType: NotificationType,
  actorId: string,
): Promise<void> {
  await getPool().query(
    "DELETE FROM tenant_notification_media WHERE tenant_id = $1 AND notification_type = $2",
    [tenantId, notificationType],
  );

  await createAuditLogEntry({
    actorType: "tenant_member",
    actorId,
    tenantId,
    action: "notification_media.unlinked",
    targetType: "tenant_notification_media",
    targetId: null,
    metadata: { notificationType },
  });
}
