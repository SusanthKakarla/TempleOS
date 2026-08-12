import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import { isGenericTenantHostname, normalizeTenantHostname } from "@/lib/tenant-domains";
import type { TenantDomain } from "@/types/db";

interface TenantDomainRow {
  id: string;
  tenant_id: string;
  hostname: string;
  kind: TenantDomain["kind"];
  status: TenantDomain["status"];
  created_at: Date;
  updated_at: Date;
}

export async function createTenantDomainForSuperAdmin(
  input: { tenantId: string; hostname: string },
  client: QueryClient = getPool(),
): Promise<TenantDomain> {
  const { rows } = await client.query<TenantDomainRow>(
    `INSERT INTO tenant_domains (tenant_id, hostname, kind, status)
     VALUES ($1, $2, 'primary', 'active')
     RETURNING *`,
    [input.tenantId, input.hostname],
  );
  return mapTenantDomain(rows[0]);
}

function mapTenantDomain(row: TenantDomainRow): TenantDomain {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    hostname: row.hostname,
    kind: row.kind,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * The tenant's public address — which is its `primary` subdomain, the same one
 * its admins already sign in on. Used by the admin portal and Super Admin to
 * show and link to the temple's website.
 *
 * Reads only; the row itself is created once at provisioning and never
 * rewritten here, so displaying the website address can never disturb a
 * temple's existing admin hostname.
 */
export async function getWebsiteHostnameForTenant(
  tenantId: string,
  client: QueryClient = getPool(),
): Promise<string | null> {
  const { rows } = await client.query<{ hostname: string }>(
    "SELECT hostname FROM tenant_domains WHERE tenant_id = $1 AND kind = 'primary' AND status = 'active' LIMIT 1",
    [tenantId],
  );
  return rows[0]?.hostname ?? null;
}

/**
 * Resolves the tenant a sign-in request belongs to, from its hostname.
 *
 * Restricted to `kind = 'primary'` — a tenant's own subdomain is the only host
 * that may establish an admin session. Rows of any other kind (such as the
 * `website` rows left behind by the abandoned second-domain design) are inert
 * here, so an obsolete hostname can never be used to reach a tenant's admin
 * portal even if it were pointed back at this deployment.
 */
export async function getActiveTenantDomainByHostname(rawHostname: string): Promise<TenantDomain | null> {
  const hostname = normalizeTenantHostname(rawHostname);
  if (!hostname || isGenericTenantHostname(hostname)) return null;

  const { rows } = await getPool().query<TenantDomainRow>(
    `SELECT *
     FROM tenant_domains
     WHERE hostname = $1 AND kind = 'primary' AND status = 'active'
     LIMIT 1`,
    [hostname],
  );
  return rows[0] ? mapTenantDomain(rows[0]) : null;
}
