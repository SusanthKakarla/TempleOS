import { cache } from "react";
import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
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
  client?: QueryClient;
}): Promise<TenantMembershipWithRoles | null> {
  const queryClient = input.client ?? getPool();
  const { rows } = await queryClient.query<TenantMembershipRow>(
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
  client: QueryClient = getPool(),
): Promise<TenantMembershipWithRoles | null> {
  const { rows } = await client.query<TenantMembershipRow>(
    `${membershipWithRolesSelect}
     WHERE tm.id = $1 AND tm.status = 'active'
     GROUP BY tm.id
     LIMIT 1`,
    [membershipId],
  );
  return rows[0] ? mapTenantMembership(rows[0]) : null;
});

export async function createTenantMembershipForProvisioning(
  input: { tenantId: string; personId: string; displayName: string },
  client: QueryClient = getPool(),
): Promise<TenantMembershipWithRoles> {
  const { rows } = await client.query<TenantMembershipRow>(
    `INSERT INTO tenant_memberships (tenant_id, person_id, display_name, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING *, ARRAY[]::text[] AS role_codes`,
    [input.tenantId, input.personId, input.displayName],
  );
  return mapTenantMembership(rows[0]);
}

export async function assignTenantMembershipRolesForProvisioning(
  input: { membershipId: string; roles: RoleCode[] },
  client: QueryClient = getPool(),
): Promise<TenantMembershipWithRoles> {
  await client.query(
    `INSERT INTO tenant_membership_roles (membership_id, role_definition_id)
     SELECT $1, id
     FROM role_definitions
     WHERE active = true AND code = ANY($2::text[])
     ON CONFLICT DO NOTHING`,
    [input.membershipId, input.roles],
  );

  const membership = await getTenantMembershipById(input.membershipId, client);
  if (!membership) {
    throw new Error("Provisioning role assignment could not reload the created membership.");
  }
  const assignedRoles = new Set(membership.roles);
  const missingRoles = input.roles.filter((role) => !assignedRoles.has(role));
  if (missingRoles.length > 0) {
    throw new Error("Provisioning role assignment incomplete.");
  }
  return membership;
}
