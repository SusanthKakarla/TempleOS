import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import type { NotificationMedia } from "@/types/db";

/**
 * A campaign's optional gallery — before/after renovation shots, festival
 * photos, annadanam photos. Rows link an existing notification_media upload
 * to a campaign (see migrations/040), so nothing here duplicates the upload
 * pipeline: MediaUpload still creates the media row, this only records which
 * ones belong to which campaign and in what order.
 */

interface CampaignMediaRow {
  id: string;
  tenant_id: string;
  category: NotificationMedia["category"];
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

function mapMedia(row: CampaignMediaRow): NotificationMedia {
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

/**
 * Gallery images in the admin's chosen order.
 *
 * Tenant-scoped through the campaign, not just the media row, so a campaign
 * id from another temple can never surface this temple's images even if the
 * join table were somehow crossed.
 */
export async function listCampaignGallery(
  tenantId: string,
  campaignId: string,
  client: QueryClient = getPool(),
): Promise<NotificationMedia[]> {
  const { rows } = await client.query<CampaignMediaRow>(
    `SELECT nm.*
     FROM campaign_media cm
     JOIN campaigns c ON c.id = cm.campaign_id
     JOIN notification_media nm ON nm.id = cm.media_id
     WHERE cm.campaign_id = $1 AND c.tenant_id = $2 AND nm.tenant_id = $2
     ORDER BY cm.position ASC, cm.created_at ASC`,
    [campaignId, tenantId],
  );
  return rows.map(mapMedia);
}

/**
 * Replaces the whole gallery in one transaction — the campaign form always
 * submits the complete, ordered list, so a diff-based API would just be a
 * more fragile way to reach the same state. Array position becomes display
 * position, which is what makes drag-to-reorder a pure client concern.
 */
export async function replaceCampaignGallery(
  tenantId: string,
  campaignId: string,
  mediaIds: string[],
): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: owned } = await client.query<{ id: string }>(
      "SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
      [campaignId, tenantId],
    );
    if (!owned[0]) {
      await client.query("ROLLBACK");
      return;
    }

    await client.query("DELETE FROM campaign_media WHERE campaign_id = $1", [campaignId]);

    if (mediaIds.length > 0) {
      // The media_id subselect is scoped to this tenant, so a caller can't
      // attach another temple's uploaded image to its own campaign by id.
      await client.query(
        `INSERT INTO campaign_media (campaign_id, media_id, position)
         SELECT $1, nm.id, ordering.position
         FROM unnest($2::uuid[]) WITH ORDINALITY AS ordering(media_id, position)
         JOIN notification_media nm ON nm.id = ordering.media_id AND nm.tenant_id = $3
         ON CONFLICT (campaign_id, media_id) DO NOTHING`,
        [campaignId, mediaIds, tenantId],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
