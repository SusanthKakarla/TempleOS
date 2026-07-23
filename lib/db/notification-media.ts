import { getPool } from "./pool";
import { createAuditLogEntry } from "./audit-log";
import { deleteImage } from "@/lib/media/imagekit";
import type { NotificationMedia, NotificationMediaCategory } from "@/types/db";

interface NotificationMediaRow {
  id: string;
  tenant_id: string;
  category: NotificationMediaCategory;
  title: string | null;
  storage_key: string;
  image_url: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  file_size: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapNotificationMedia(row: NotificationMediaRow): NotificationMedia {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    category: row.category,
    title: row.title,
    storageKey: row.storage_key,
    imageUrl: row.image_url,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    fileSize: row.file_size,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface CreateNotificationMediaInput {
  category: NotificationMediaCategory;
  title: string | null;
  storageKey: string;
  imageUrl: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSize: number;
  createdBy: string | null;
}

export async function createNotificationMedia(
  tenantId: string,
  input: CreateNotificationMediaInput,
): Promise<NotificationMedia> {
  const { rows } = await getPool().query<NotificationMediaRow>(
    `INSERT INTO notification_media
       (tenant_id, category, title, storage_key, image_url, mime_type, width, height, file_size, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      tenantId,
      input.category,
      input.title,
      input.storageKey,
      input.imageUrl,
      input.mimeType,
      input.width,
      input.height,
      input.fileSize,
      input.createdBy,
    ],
  );
  const media = mapNotificationMedia(rows[0]);

  await createAuditLogEntry({
    actorType: "tenant_member",
    actorId: input.createdBy ?? tenantId,
    tenantId,
    action: "notification_media.uploaded",
    targetType: "notification_media",
    targetId: media.id,
    metadata: { category: media.category, title: media.title },
  });

  return media;
}

export async function getNotificationMediaById(tenantId: string, id: string): Promise<NotificationMedia | null> {
  const { rows } = await getPool().query<NotificationMediaRow>(
    "SELECT * FROM notification_media WHERE tenant_id = $1 AND id = $2",
    [tenantId, id],
  );
  return rows[0] ? mapNotificationMedia(rows[0]) : null;
}

export async function listNotificationMedia(
  tenantId: string,
  category?: NotificationMediaCategory,
): Promise<NotificationMedia[]> {
  const conditions = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  const { rows } = await getPool().query<NotificationMediaRow>(
    `SELECT * FROM notification_media WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params,
  );
  return rows.map(mapNotificationMedia);
}

/** Deletes the ImageKit asset first, then the DB row — a failed ImageKit call leaves the row intact for retry. */
export async function deleteNotificationMedia(tenantId: string, id: string, actorId: string): Promise<boolean> {
  const media = await getNotificationMediaById(tenantId, id);
  if (!media) return false;

  await deleteImage(media.storageKey);

  const result = await getPool().query("DELETE FROM notification_media WHERE tenant_id = $1 AND id = $2", [
    tenantId,
    id,
  ]);

  await createAuditLogEntry({
    actorType: "tenant_member",
    actorId,
    tenantId,
    action: "notification_media.deleted",
    targetType: "notification_media",
    targetId: id,
    metadata: { category: media.category, title: media.title },
  });

  return (result.rowCount ?? 0) > 0;
}
