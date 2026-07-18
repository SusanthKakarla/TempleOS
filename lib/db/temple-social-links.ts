import { getPool } from "./pool";
import type { SocialPlatform, TempleSocialLink } from "@/types/db";

interface TempleSocialLinkRow {
  id: string;
  tenant_id: string;
  platform: SocialPlatform;
  url: string;
  created_at: Date;
  updated_at: Date;
}

function mapSocialLink(row: TempleSocialLinkRow): TempleSocialLink {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    platform: row.platform,
    url: row.url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listSocialLinks(tenantId: string): Promise<TempleSocialLink[]> {
  const { rows } = await getPool().query<TempleSocialLinkRow>(
    "SELECT * FROM temple_social_links WHERE tenant_id = $1 ORDER BY platform ASC",
    [tenantId],
  );
  return rows.map(mapSocialLink);
}

/** `platform` is the natural key (UNIQUE(tenant_id, platform)) — insert or replace the URL. */
export async function upsertSocialLink(
  tenantId: string,
  platform: SocialPlatform,
  url: string,
): Promise<TempleSocialLink> {
  const { rows } = await getPool().query<TempleSocialLinkRow>(
    `INSERT INTO temple_social_links (tenant_id, platform, url)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, platform) DO UPDATE SET url = EXCLUDED.url, updated_at = now()
     RETURNING *`,
    [tenantId, platform, url],
  );
  return mapSocialLink(rows[0]);
}

export async function deleteSocialLink(tenantId: string, platform: SocialPlatform): Promise<boolean> {
  const result = await getPool().query(
    "DELETE FROM temple_social_links WHERE tenant_id = $1 AND platform = $2",
    [tenantId, platform],
  );
  return (result.rowCount ?? 0) > 0;
}
