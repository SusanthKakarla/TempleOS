import { getPool } from "@/lib/db/pool";
import type { QueryClient } from "@/lib/db/query-client";

export interface WebsiteBackfillResult {
  /** Tenants examined. */
  scanned: number;
  /** tenant_websites rows created (never updated — existing config is untouched). */
  websitesCreated: number;
  /** Tenants skipped, with the reason. */
  skipped: { slug: string; reason: string }[];
}

/**
 * Gives temples created before migration 041 the website configuration row
 * that provisioning now creates automatically.
 *
 * It creates NO domain rows. A temple's website is served from the subdomain
 * it already has — the `primary` hostname its admins sign in on — so there is
 * nothing to provision at the DNS or database level for an existing temple.
 * That also means this backfill cannot affect how any temple's admin portal
 * resolves: it never reads, writes or deletes tenant_domains at all.
 *
 * Idempotent by construction, and safe to run while temples are being created:
 * the insert uses ON CONFLICT (tenant_id) DO NOTHING, so a temple that already
 * has a website row keeps its configuration exactly as its admin left it.
 *
 * Websites are created DISABLED, matching provisioning: nothing is published
 * under a temple's name until an admin fills it in and switches it on.
 */
export async function backfillTenantWebsites(
  options: { dryRun?: boolean } = {},
  client: QueryClient = getPool(),
): Promise<WebsiteBackfillResult> {
  const result: WebsiteBackfillResult = { scanned: 0, websitesCreated: 0, skipped: [] };

  const { rows: tenants } = await client.query<{ id: string; slug: string; name: string; has_website: boolean }>(
    `SELECT t.id, t.slug, t.name,
            EXISTS (SELECT 1 FROM tenant_websites w WHERE w.tenant_id = t.id) AS has_website
     FROM tenants t
     WHERE t.status = 'active'
     ORDER BY t.created_at ASC`,
  );

  result.scanned = tenants.length;

  for (const tenant of tenants) {
    if (tenant.has_website) continue;

    if (options.dryRun) {
      result.websitesCreated += 1;
      continue;
    }

    const { rowCount } = await client.query(
      `INSERT INTO tenant_websites (tenant_id, enabled, display_name, languages)
       VALUES ($1, false, $2, ARRAY['en']::text[])
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenant.id, tenant.name],
    );
    if ((rowCount ?? 0) > 0) result.websitesCreated += 1;
  }

  return result;
}
