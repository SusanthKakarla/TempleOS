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

export async function getActiveTenantDomainByHostname(rawHostname: string): Promise<TenantDomain | null> {
  const hostname = normalizeTenantHostname(rawHostname);
  if (!hostname || isGenericTenantHostname(hostname)) return null;

  const { rows } = await getPool().query<TenantDomainRow>(
    `SELECT *
     FROM tenant_domains
     WHERE hostname = $1 AND status = 'active'
     LIMIT 1`,
    [hostname],
  );
  return rows[0] ? mapTenantDomain(rows[0]) : null;
}
