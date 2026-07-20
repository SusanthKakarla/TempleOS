import { cache } from "react";
import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import { isRoleCode, type RoleCode, type SupportedLanguage, type TenantMembership } from "@/types/db";
import { DEFAULT_PAGE_SIZE, computeOffset } from "@/lib/pagination";

export interface TenantMembershipWithRoles extends TenantMembership {
  roles: RoleCode[];
}

interface TenantMembershipRow {
  id: string;
  tenant_id: string;
  person_id: string;
  display_name: string;
  status: TenantMembership["status"];
  preferred_ui_language: SupportedLanguage | null;
  last_signed_in_at: Date | null;
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
    preferredUiLanguage: row.preferred_ui_language,
    lastSignedInAt: row.last_signed_in_at?.toISOString() ?? null,
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

export async function getTenantMembershipByTenantAndIdForSuperAdmin(
  input: { tenantId: string; membershipId: string },
  client: QueryClient = getPool(),
): Promise<TenantMembershipWithRoles | null> {
  const { rows } = await client.query<TenantMembershipRow>(
    `${membershipWithRolesSelect}
     WHERE tm.tenant_id = $1 AND tm.id = $2 AND tm.status = 'active'
     GROUP BY tm.id
     LIMIT 1`,
    [input.tenantId, input.membershipId],
  );
  return rows[0] ? mapTenantMembership(rows[0]) : null;
}

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

export async function replaceTenantMembershipRolesForSuperAdmin(
  input: { tenantId: string; membershipId: string; roles: RoleCode[] },
  client: QueryClient = getPool(),
): Promise<TenantMembershipWithRoles> {
  const roles = Array.from(new Set(input.roles));
  const { rows: lockedRows } = await client.query<{ id: string }>(
    `SELECT id
     FROM tenant_memberships
     WHERE tenant_id = $1 AND id = $2 AND status = 'active'
     FOR UPDATE`,
    [input.tenantId, input.membershipId],
  );
  if (!lockedRows[0]) {
    throw new Error("Super-admin role assignment target is not active in the requested tenant.");
  }

  await client.query("DELETE FROM tenant_membership_roles WHERE membership_id = $1", [
    input.membershipId,
  ]);

  if (roles.length > 0) {
    await client.query(
      `INSERT INTO tenant_membership_roles (membership_id, role_definition_id)
       SELECT $1, id
       FROM role_definitions
       WHERE active = true AND code = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [input.membershipId, roles],
    );
  }

  const membership = await getTenantMembershipByTenantAndIdForSuperAdmin(
    { tenantId: input.tenantId, membershipId: input.membershipId },
    client,
  );
  if (!membership) {
    throw new Error("Super-admin role assignment could not reload the target membership.");
  }

  const assignedRoles = new Set(membership.roles);
  const missingRoles = roles.filter((role) => !assignedRoles.has(role));
  if (missingRoles.length > 0) {
    throw new Error("Super-admin role assignment incomplete.");
  }

  return membership;
}

export async function updateTenantMembershipLocale(
  membershipId: string,
  locale: SupportedLanguage,
  client: QueryClient = getPool(),
): Promise<void> {
  await client.query(
    `UPDATE tenant_memberships SET preferred_ui_language = $1 WHERE id = $2`,
    [locale, membershipId],
  );
}

export interface TenantMembershipListItem extends TenantMembershipWithRoles {
  phoneNumber: string;
}

interface TenantMembershipListRow extends TenantMembershipRow {
  phone_number: string;
}

function mapTenantMembershipListItem(row: TenantMembershipListRow): TenantMembershipListItem {
  return { ...mapTenantMembership(row), phoneNumber: row.phone_number };
}

export interface ListTenantMembershipsFilters {
  search?: string;
  status?: TenantMembership["status"];
  role?: RoleCode;
  page?: number;
  pageSize?: number;
  sort?: "name" | "status" | "lastSignIn";
  dir?: "asc" | "desc";
}

const MEMBERSHIP_SORT_COLUMNS: Record<NonNullable<ListTenantMembershipsFilters["sort"]>, string> = {
  name: "lower(tm.display_name)",
  status: "tm.status",
  lastSignIn: "tm.last_signed_in_at",
};

function buildMembershipConditions(filters: Pick<ListTenantMembershipsFilters, "search" | "status" | "role">) {
  const conditions = ["tm.tenant_id = $1"];
  const params: unknown[] = [];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`tm.status = $${params.length + 1}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(tm.display_name ILIKE $${params.length + 1} OR p.phone_number ILIKE $${params.length + 1})`);
  }
  if (filters.role) {
    params.push(filters.role);
    conditions.push(
      `EXISTS (
        SELECT 1 FROM tenant_membership_roles tmr2
        JOIN role_definitions rd2 ON rd2.id = tmr2.role_definition_id AND rd2.active = true
        WHERE tmr2.membership_id = tm.id AND rd2.code = $${params.length + 1}
      )`,
    );
  }
  return { conditions, params };
}

/** `page`/`pageSize` are optional — omitted, this returns the full unpaginated result (existing callers rely on this). */
export async function listTenantMembershipsForTenant(
  tenantId: string,
  filters: ListTenantMembershipsFilters = {},
  client: QueryClient = getPool(),
): Promise<TenantMembershipListItem[]> {
  const { conditions, params: filterParams } = buildMembershipConditions(filters);
  const params: unknown[] = [tenantId, ...filterParams];

  const sortColumn = filters.sort ? MEMBERSHIP_SORT_COLUMNS[filters.sort] : "lower(tm.display_name)";
  const dir = filters.dir === "desc" ? "DESC" : "ASC";

  let query = `SELECT tm.*, p.phone_number,
            COALESCE(
              array_agg(rd.code ORDER BY rd.code) FILTER (WHERE rd.code IS NOT NULL),
              ARRAY[]::text[]
            ) AS role_codes
     FROM tenant_memberships tm
     INNER JOIN persons p ON p.id = tm.person_id
     LEFT JOIN tenant_membership_roles tmr ON tmr.membership_id = tm.id
     LEFT JOIN role_definitions rd ON rd.id = tmr.role_definition_id AND rd.active = true
     WHERE ${conditions.join(" AND ")}
     GROUP BY tm.id, p.phone_number
     ORDER BY ${sortColumn} ${dir}`;

  if (filters.page !== undefined) {
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    params.push(pageSize, computeOffset(filters.page, pageSize));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const { rows } = await client.query<TenantMembershipListRow>(query, params);
  return rows.map(mapTenantMembershipListItem);
}

export async function countTenantMembershipsFiltered(
  tenantId: string,
  filters: Pick<ListTenantMembershipsFilters, "search" | "status" | "role"> = {},
  client: QueryClient = getPool(),
): Promise<number> {
  const { conditions, params: filterParams } = buildMembershipConditions(filters);
  const params: unknown[] = [tenantId, ...filterParams];
  const { rows } = await client.query<{ count: string }>(
    `SELECT count(DISTINCT tm.id) AS count
     FROM tenant_memberships tm
     INNER JOIN persons p ON p.id = tm.person_id
     WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.count ?? 0);
}

export async function listTenantMembershipsByIds(
  tenantId: string,
  ids: string[],
  client: QueryClient = getPool(),
): Promise<TenantMembershipListItem[]> {
  if (ids.length === 0) return [];
  const { rows } = await client.query<TenantMembershipListRow>(
    `SELECT tm.*, p.phone_number,
            COALESCE(
              array_agg(rd.code ORDER BY rd.code) FILTER (WHERE rd.code IS NOT NULL),
              ARRAY[]::text[]
            ) AS role_codes
     FROM tenant_memberships tm
     INNER JOIN persons p ON p.id = tm.person_id
     LEFT JOIN tenant_membership_roles tmr ON tmr.membership_id = tm.id
     LEFT JOIN role_definitions rd ON rd.id = tmr.role_definition_id AND rd.active = true
     WHERE tm.tenant_id = $1 AND tm.id = ANY($2::uuid[])
     GROUP BY tm.id, p.phone_number
     ORDER BY lower(tm.display_name) ASC`,
    [tenantId, ids],
  );
  return rows.map(mapTenantMembershipListItem);
}

/** User import — checks a batch of normalized phone numbers against existing ACTIVE members of this tenant only (persons are legitimately shared cross-tenant, so this is scoped, not global). */
export async function listActiveMemberPhonesForTenant(
  tenantId: string,
  phones: string[],
  client: QueryClient = getPool(),
): Promise<Set<string>> {
  if (phones.length === 0) return new Set();
  const { rows } = await client.query<{ phone_number: string }>(
    `SELECT p.phone_number
     FROM tenant_memberships tm
     JOIN persons p ON p.id = tm.person_id
     WHERE tm.tenant_id = $1 AND tm.status = 'active' AND p.phone_number = ANY($2::text[])`,
    [tenantId, phones],
  );
  return new Set(rows.map((row) => row.phone_number));
}

export async function touchLastSignedIn(
  membershipId: string,
  client: QueryClient = getPool(),
): Promise<void> {
  await client.query(`UPDATE tenant_memberships SET last_signed_in_at = now() WHERE id = $1`, [
    membershipId,
  ]);
}

async function setTenantMembershipStatusInternal(
  tenantId: string,
  membershipId: string,
  status: TenantMembership["status"],
  client: QueryClient,
): Promise<TenantMembershipListItem | null> {
  const { rows: lockedRows } = await client.query<{ id: string }>(
    `SELECT id FROM tenant_memberships WHERE tenant_id = $1 AND id = $2 FOR UPDATE`,
    [tenantId, membershipId],
  );
  if (!lockedRows[0]) return null;

  await client.query(`UPDATE tenant_memberships SET status = $1, updated_at = now() WHERE id = $2`, [
    status,
    membershipId,
  ]);

  const { rows } = await client.query<TenantMembershipListRow>(
    `SELECT tm.*, p.phone_number,
            COALESCE(
              array_agg(rd.code ORDER BY rd.code) FILTER (WHERE rd.code IS NOT NULL),
              ARRAY[]::text[]
            ) AS role_codes
     FROM tenant_memberships tm
     INNER JOIN persons p ON p.id = tm.person_id
     LEFT JOIN tenant_membership_roles tmr ON tmr.membership_id = tm.id
     LEFT JOIN role_definitions rd ON rd.id = tmr.role_definition_id AND rd.active = true
     WHERE tm.id = $1
     GROUP BY tm.id, p.phone_number
     LIMIT 1`,
    [membershipId],
  );
  return rows[0] ? mapTenantMembershipListItem(rows[0]) : null;
}

/** No-ops (returns the current row unchanged) if the membership is already at the target status. */
export async function deactivateTenantMembership(
  tenantId: string,
  membershipId: string,
  client: QueryClient = getPool(),
): Promise<TenantMembershipListItem | null> {
  return setTenantMembershipStatusInternal(tenantId, membershipId, "inactive", client);
}

export async function reactivateTenantMembership(
  tenantId: string,
  membershipId: string,
  client: QueryClient = getPool(),
): Promise<TenantMembershipListItem | null> {
  return setTenantMembershipStatusInternal(tenantId, membershipId, "active", client);
}

/**
 * Tenant-scoped alias of replaceTenantMembershipRolesForSuperAdmin — that function is already
 * scoped by its own tenantId param (the "ForSuperAdmin" suffix is a naming artifact from its
 * original caller, not an auth boundary), but a distinct name avoids misleading tenant-admin
 * call sites.
 */
export async function replaceTenantMembershipRoles(
  input: { tenantId: string; membershipId: string; roles: RoleCode[] },
  client: QueryClient = getPool(),
): Promise<TenantMembershipWithRoles> {
  return replaceTenantMembershipRolesForSuperAdmin(input, client);
}
