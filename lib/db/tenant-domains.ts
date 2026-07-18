import { getPool } from "./pool";
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
