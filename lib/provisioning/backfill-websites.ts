import { getPool } from "@/lib/db/pool";
import type { QueryClient } from "@/lib/db/query-client";
import { buildWebsiteHostname } from "@/lib/site/website-host";

export interface WebsiteBackfillResult {
  /** Tenants examined. */
  scanned: number;
  /** tenant_websites rows created (never updated — existing config is untouched). */
  websitesCreated: number;
  /** website-kind tenant_domains rows created. */
  domainsCreated: number;
  /** Tenants skipped because their slug can't form a valid hostname, or the hostname is already taken. */
  skipped: { slug: string; reason: string }[];
}

/**
 * Gives temples created before migration 041 the website row and subdomain
 * that provisioning now creates automatically.
 *
 * Idempotent by construction, so it is safe to run repeatedly and safe to run
 * while temples are being created:
 *
 *  - the website row uses ON CONFLICT (tenant_id) DO NOTHING, so a temple that
 *    already has one keeps its configuration exactly as the admin left it —
 *    this backfill never edits an existing website;
 *  - the domain row is inserted only when the tenant has no website-kind
 *    domain, and conflicts on the global hostname unique index are caught and
 *    reported rather than overwriting whoever owns it;
 *  - `primary` (admin) domains are never read, updated or deleted, so no
 *    temple's existing admin hostname can change.
 *
 * Websites are created DISABLED, matching provisioning: a subdomain becomes
 * resolvable, but nothing is published under a temple's name until an admin
 * fills it in and switches it on.
 */
export async function backfillTenantWebsites(
  options: { dryRun?: boolean } = {},
  client: QueryClient = getPool(),
): Promise<WebsiteBackfillResult> {
  const result: WebsiteBackfillResult = { scanned: 0, websitesCreated: 0, domainsCreated: 0, skipped: [] };

  const { rows: tenants } = await client.query<{ id: string; slug: string; name: string; has_website: boolean; has_domain: boolean }>(
    `SELECT t.id, t.slug, t.name,
            EXISTS (SELECT 1 FROM tenant_websites w WHERE w.tenant_id = t.id) AS has_website,
            EXISTS (SELECT 1 FROM tenant_domains d WHERE d.tenant_id = t.id AND d.kind = 'website') AS has_domain
     FROM tenants t
     WHERE t.status = 'active'
     ORDER BY t.created_at ASC`,
  );

  result.scanned = tenants.length;

  for (const tenant of tenants) {
    const hostname = buildWebsiteHostname(tenant.slug);
    if (!hostname) {
      result.skipped.push({ slug: tenant.slug, reason: "slug cannot form a valid hostname" });
      continue;
    }

    if (!tenant.has_website) {
      if (!options.dryRun) {
        const { rowCount } = await client.query(
          `INSERT INTO tenant_websites (tenant_id, enabled, display_name, languages)
           VALUES ($1, false, $2, ARRAY['en']::text[])
           ON CONFLICT (tenant_id) DO NOTHING`,
          [tenant.id, tenant.name],
        );
        if ((rowCount ?? 0) > 0) result.websitesCreated += 1;
      } else {
        result.websitesCreated += 1;
      }
    }

    if (!tenant.has_domain) {
      // hostname is globally unique across every tenant and kind, so a clash
      // means another temple already answers on it. Reported, never stolen.
      const { rows: taken } = await client.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM tenant_domains WHERE hostname = $1",
        [hostname],
      );
      if (taken[0] && taken[0].tenant_id !== tenant.id) {
        result.skipped.push({ slug: tenant.slug, reason: `hostname ${hostname} already belongs to another tenant` });
        continue;
      }

      if (!options.dryRun) {
        const { rowCount } = await client.query(
          `INSERT INTO tenant_domains (tenant_id, hostname, kind, status)
           VALUES ($1, $2, 'website', 'active')
           ON CONFLICT (hostname) DO NOTHING`,
          [tenant.id, hostname],
        );
        if ((rowCount ?? 0) > 0) result.domainsCreated += 1;
      } else {
        result.domainsCreated += 1;
      }
    }
  }

  return result;
}
