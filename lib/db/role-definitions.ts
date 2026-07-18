import { getPool } from "./pool";
import type { RoleCode, RoleDefinition } from "@/types/db";

interface RoleDefinitionRow {
  id: string;
  code: RoleCode;
  display_name: string;
  description: string | null;
  capability_set: Record<string, unknown>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface V0RoleDefinitionSeed {
  code: RoleCode;
  displayName: string;
  description: string;
  capabilitySet: {
    dashboardAccess: boolean;
    manageTenantMembers: boolean;
    manageTenantRoles: boolean;
    identityMarker: boolean;
    tenantRelationshipMarker: boolean;
  };
  active: boolean;
}

export const V0_ROLE_DEFINITIONS: V0RoleDefinitionSeed[] = [
  {
    code: "admin",
    displayName: "Admin",
    description: "Dashboard access plus tenant member and role management inside the tenant.",
    capabilitySet: {
      dashboardAccess: true,
      manageTenantMembers: true,
      manageTenantRoles: true,
      identityMarker: false,
      tenantRelationshipMarker: false,
    },
    active: true,
  },
  {
    code: "priest",
    displayName: "Priest",
    description: "Priest identity marker for V0; no dashboard permission by itself.",
    capabilitySet: {
      dashboardAccess: false,
      manageTenantMembers: false,
      manageTenantRoles: false,
      identityMarker: true,
      tenantRelationshipMarker: false,
    },
    active: true,
  },
  {
    code: "committee_member",
    displayName: "Committee Member",
    description: "Committee identity marker for V0; no dashboard permission by itself.",
    capabilitySet: {
      dashboardAccess: false,
      manageTenantMembers: false,
      manageTenantRoles: false,
      identityMarker: true,
      tenantRelationshipMarker: false,
    },
    active: true,
  },
  {
    code: "volunteer",
    displayName: "Volunteer",
    description: "Volunteer identity marker for V0; no dashboard permission by itself.",
    capabilitySet: {
      dashboardAccess: false,
      manageTenantMembers: false,
      manageTenantRoles: false,
      identityMarker: true,
      tenantRelationshipMarker: false,
    },
    active: true,
  },
  {
    code: "devotee",
    displayName: "Devotee",
    description: "Tenant relationship marker; does not grant dashboard login.",
    capabilitySet: {
      dashboardAccess: false,
      manageTenantMembers: false,
      manageTenantRoles: false,
      identityMarker: false,
      tenantRelationshipMarker: true,
    },
    active: true,
  },
];

function mapRoleDefinition(row: RoleDefinitionRow): RoleDefinition {
  return {
    id: row.id,
    code: row.code,
    displayName: row.display_name,
    description: row.description,
    capabilitySet: row.capability_set,
    active: row.active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function seedV0RoleDefinitions(): Promise<RoleDefinition[]> {
  const client = await getPool().connect();
  const roles: RoleDefinition[] = [];

  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE role_definitions
       SET active = false, updated_at = now()
       WHERE code <> ALL($1::text[])`,
      [V0_ROLE_DEFINITIONS.map((role) => role.code)],
    );

    for (const role of V0_ROLE_DEFINITIONS) {
      const { rows } = await client.query<RoleDefinitionRow>(
        `INSERT INTO role_definitions (code, display_name, description, capability_set, active)
         VALUES ($1, $2, $3, $4::jsonb, $5)
         ON CONFLICT (code)
         DO UPDATE SET display_name = EXCLUDED.display_name,
                       description = EXCLUDED.description,
                       capability_set = EXCLUDED.capability_set,
                       active = EXCLUDED.active,
                       updated_at = now()
         RETURNING *`,
        [
          role.code,
          role.displayName,
          role.description,
          JSON.stringify(role.capabilitySet),
          role.active,
        ],
      );
      roles.push(mapRoleDefinition(rows[0]));
    }

    await client.query("COMMIT");
    return roles;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
