import { getPool } from "./pool";
import type { Tenant } from "@/types/db";

interface TenantRow {
  id: string;
  name: string;
  default_contact_phone: string | null;
  address: string | null;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

function mapTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    defaultContactPhone: row.default_contact_phone,
    address: row.address,
    timezone: row.timezone,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** The MVP supports exactly one tenant; this is the canonical lookup for it. */
export async function getPilotTenant(): Promise<Tenant | null> {
  const { rows } = await getPool().query<TenantRow>(
    "SELECT * FROM tenants ORDER BY created_at ASC LIMIT 1",
  );
  return rows[0] ? mapTenant(rows[0]) : null;
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const { rows } = await getPool().query<TenantRow>("SELECT * FROM tenants WHERE id = $1", [
    tenantId,
  ]);
  return rows[0] ? mapTenant(rows[0]) : null;
}

export async function updateTenant(
  tenantId: string,
  fields: Partial<Pick<Tenant, "name" | "defaultContactPhone" | "address" | "timezone">>,
): Promise<Tenant> {
  const { rows } = await getPool().query<TenantRow>(
    `UPDATE tenants
     SET name = COALESCE($2, name),
         default_contact_phone = COALESCE($3, default_contact_phone),
         address = COALESCE($4, address),
         timezone = COALESCE($5, timezone),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      tenantId,
      fields.name ?? null,
      fields.defaultContactPhone ?? null,
      fields.address ?? null,
      fields.timezone ?? null,
    ],
  );
  return mapTenant(rows[0]);
}
