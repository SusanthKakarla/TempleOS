import { cache } from "react";
import { getPool } from "./pool";
import { isRoleCode, type RoleCode, type TenantMembership } from "@/types/db";

export interface TenantMembershipWithRoles extends TenantMembership {
  roles: RoleCode[];
}

interface TenantMembershipRow {
  id: string;
  tenant_id: string;
  person_id: string;
  display_name: string;
  status: TenantMembership["status"];
  role_codes: string[] | null;
  created_at: Date;
  updated_at: Date;
}

function mapTenantMembership(row: TenantMembershipRow): TenantMembershipWithRoles {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    personId: row.person_id,
    displayName: row.display_name,
    status: row.status,
    roles: (row.role_codes ?? []).filter(isRoleCode),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const membershipWithRolesSelect = `
  SELECT tm.*,
         COALESCE(
           array_agg(rd.code ORDER BY rd.code) FILTER (WHERE rd.code IS NOT NULL),
           ARRAY[]::text[]
         ) AS role_codes
  FROM tenant_memberships tm
  LEFT JOIN tenant_membership_roles tmr ON tmr.membership_id = tm.id
  LEFT JOIN role_definitions rd ON rd.id = tmr.role_definition_id AND rd.active = true
`;

export async function findActiveTenantMembershipByPersonAndTenant(input: {
  personId: string;
  tenantId: string;
}): Promise<TenantMembershipWithRoles | null> {
  const { rows } = await getPool().query<TenantMembershipRow>(
    `${membershipWithRolesSelect}
     WHERE tm.person_id = $1 AND tm.tenant_id = $2 AND tm.status = 'active'
     GROUP BY tm.id
     LIMIT 1`,
    [input.personId, input.tenantId],
  );
  return rows[0] ? mapTenantMembership(rows[0]) : null;
}

export const getTenantMembershipById = cache(async function getTenantMembershipById(
  membershipId: string,
): Promise<TenantMembershipWithRoles | null> {
  const { rows } = await getPool().query<TenantMembershipRow>(
    `${membershipWithRolesSelect}
     WHERE tm.id = $1 AND tm.status = 'active'
     GROUP BY tm.id
     LIMIT 1`,
    [membershipId],
  );
  return rows[0] ? mapTenantMembership(rows[0]) : null;
});
