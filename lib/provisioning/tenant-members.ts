import { z } from "zod";
import { createAuditLogEntry } from "@/lib/db/audit-log";
import { getPool } from "@/lib/db/pool";
import type { QueryClient } from "@/lib/db/query-client";
import { listActiveRoleCodesForSuperAdmin } from "@/lib/db/role-definitions";
import {
  findActiveTenantMembershipByPersonAndTenant,
  getTenantMembershipByTenantAndIdForSuperAdmin,
  createTenantMembershipForProvisioning,
  assignTenantMembershipRolesForProvisioning,
  deactivateTenantMembership,
  reactivateTenantMembership,
  replaceTenantMembershipRoles,
  type TenantMembershipListItem,
  type TenantMembershipWithRoles,
} from "@/lib/db/tenant-memberships";
import { findOrCreatePersonByPhoneForProvisioning } from "@/lib/db/persons";
import { normalizePhoneNumber } from "@/lib/phone.mts";
import { isRoleCode, type RoleCode, type TenantMembershipStatus } from "@/types/db";

export interface TenantAdminActor {
  type: "tenant_member";
  tenantId: string;
  membershipId: string;
}

export interface TenantMemberValidationIssue {
  path: string[];
  message: string;
}

export class TenantMemberActionError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 409 | 500,
    public readonly code:
      | "VALIDATION_ERROR"
      | "MEMBER_NOT_FOUND"
      | "ALREADY_MEMBER"
      | "LAST_ADMIN_GUARD"
      | "SELF_ACTION_FORBIDDEN"
      | "ACTION_FAILED",
    public readonly errors: TenantMemberValidationIssue[] = [],
  ) {
    super(message);
    this.name = "TenantMemberActionError";
  }
}

function normalizeRoleCodes(rawRoles: string[]): { roles: RoleCode[]; issues: TenantMemberValidationIssue[] } {
  const issues: TenantMemberValidationIssue[] = [];
  const roles: RoleCode[] = [];
  for (const role of rawRoles) {
    if (!isRoleCode(role)) {
      issues.push({ path: ["roles"], message: `Unknown role code: ${role}` });
      continue;
    }
    if (!roles.includes(role)) roles.push(role);
  }
  return { roles, issues };
}

/** Active admin memberships in the tenant, excluding one membership id (used to check "would this be the last admin"). */
async function countOtherActiveAdmins(
  tenantId: string,
  excludeMembershipId: string,
  client: QueryClient,
): Promise<number> {
  const { rows } = await client.query<{ count: string }>(
    `SELECT count(DISTINCT tm.id) AS count
     FROM tenant_memberships tm
     JOIN tenant_membership_roles tmr ON tmr.membership_id = tm.id
     JOIN role_definitions rd ON rd.id = tmr.role_definition_id AND rd.code = 'admin' AND rd.active = true
     WHERE tm.tenant_id = $1 AND tm.status = 'active' AND tm.id <> $2`,
    [tenantId, excludeMembershipId],
  );
  return Number(rows[0]?.count ?? 0);
}

const inviteTenantMemberSchema = z.object({
  phoneNumber: z.string().trim().min(1, "Phone number is required"),
  displayName: z.string().trim().min(1, "Name is required").max(200, "Name must be at most 200 characters"),
  roles: z.array(z.string()).min(1, "At least one role is required"),
});

export interface InviteTenantMemberInput {
  phoneNumber: string;
  displayName: string;
  roles: RoleCode[];
}

export type InviteTenantMemberValidationResult =
  | { ok: true; data: InviteTenantMemberInput }
  | { ok: false; errors: TenantMemberValidationIssue[] };

export function parseInviteTenantMemberInput(raw: unknown): InviteTenantMemberValidationResult {
  const parsed = inviteTenantMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })),
    };
  }

  const issues: TenantMemberValidationIssue[] = [];
  const phoneNumber = normalizePhoneNumber(parsed.data.phoneNumber);
  if (!phoneNumber) {
    issues.push({ path: ["phoneNumber"], message: "Enter a valid phone number." });
  }
  const { roles, issues: roleIssues } = normalizeRoleCodes(parsed.data.roles);
  issues.push(...roleIssues);
  if (roles.length === 0) {
    issues.push({ path: ["roles"], message: "At least one valid role is required." });
  }

  if (issues.length > 0 || !phoneNumber) {
    return { ok: false, errors: issues };
  }

  return { ok: true, data: { phoneNumber, displayName: parsed.data.displayName, roles } };
}

export async function inviteTenantMember(
  input: InviteTenantMemberInput,
  actor: TenantAdminActor,
): Promise<TenantMembershipListItem> {
  const activeRoleCodes = new Set(await listActiveRoleCodesForSuperAdmin(input.roles));
  const inactiveRoles = input.roles.filter((role) => !activeRoleCodes.has(role));
  if (inactiveRoles.length > 0) {
    throw new TenantMemberActionError(
      "Invite input is invalid.",
      400,
      "VALIDATION_ERROR",
      inactiveRoles.map((role) => ({ path: ["roles"], message: `Inactive role code: ${role}` })),
    );
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const person = await findOrCreatePersonByPhoneForProvisioning(
      { phoneNumber: input.phoneNumber, displayName: input.displayName },
      client,
    );

    const existing = await findActiveTenantMembershipByPersonAndTenant({
      personId: person.id,
      tenantId: actor.tenantId,
      client,
    });
    if (existing) {
      throw new TenantMemberActionError("This phone number is already a member of this temple.", 409, "ALREADY_MEMBER");
    }

    const membership = await createTenantMembershipForProvisioning(
      { tenantId: actor.tenantId, personId: person.id, displayName: input.displayName },
      client,
    );
    const member = await assignTenantMembershipRolesForProvisioning(
      { membershipId: membership.id, roles: input.roles },
      client,
    );

    await createAuditLogEntry(
      {
        actorType: "tenant_member",
        actorId: actor.membershipId,
        tenantId: actor.tenantId,
        action: "tenant_member.invited",
        targetType: "tenant_membership",
        targetId: member.id,
        metadata: { personId: person.id, roles: input.roles, phoneNumber: input.phoneNumber },
      },
      client,
    );

    await client.query("COMMIT");
    return { ...member, phoneNumber: person.phoneNumber };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original error for callers.
    }
    if (err instanceof TenantMemberActionError) throw err;
    if (isUniqueViolation(err)) {
      throw new TenantMemberActionError("This phone number is already a member of this temple.", 409, "ALREADY_MEMBER");
    }
    throw new TenantMemberActionError("Failed to invite member.", 500, "ACTION_FAILED");
  } finally {
    client.release();
  }
}

export interface ChangeTenantMemberRolesInput {
  membershipId: string;
  roles: RoleCode[];
}

export async function changeTenantMemberRoles(
  input: ChangeTenantMemberRolesInput,
  actor: TenantAdminActor,
): Promise<TenantMembershipWithRoles> {
  const activeRoleCodes = new Set(await listActiveRoleCodesForSuperAdmin(input.roles));
  const inactiveRoles = input.roles.filter((role) => !activeRoleCodes.has(role));
  if (inactiveRoles.length > 0) {
    throw new TenantMemberActionError(
      "Role change input is invalid.",
      400,
      "VALIDATION_ERROR",
      inactiveRoles.map((role) => ({ path: ["roles"], message: `Inactive role code: ${role}` })),
    );
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    // Fetched BEFORE the change — replaceTenantMembershipRoles deletes and
    // re-inserts the role rows, so its own return value already reflects the
    // NEW state. Capturing "before" separately is the only way to log an
    // honest diff (and to know whether this member currently holds admin at
    // all, for the last-admin guard below).
    const currentMembership = await getTenantMembershipByTenantAndIdForSuperAdmin(
      { tenantId: actor.tenantId, membershipId: input.membershipId },
      client,
    );
    if (!currentMembership) {
      throw new TenantMemberActionError("Member not found.", 404, "MEMBER_NOT_FOUND");
    }

    const willKeepAdmin = input.roles.includes("admin");
    if (!willKeepAdmin && currentMembership.roles.includes("admin")) {
      const otherAdmins = await countOtherActiveAdmins(actor.tenantId, input.membershipId, client);
      if (otherAdmins === 0) {
        throw new TenantMemberActionError(
          "Cannot remove the admin role from the temple's only admin.",
          409,
          "LAST_ADMIN_GUARD",
        );
      }
    }

    const updated = await replaceTenantMembershipRoles(
      { tenantId: actor.tenantId, membershipId: input.membershipId, roles: input.roles },
      client,
    );

    const previousRoles = new Set(currentMembership.roles);
    const nextRoles = new Set(updated.roles);
    const assignedRoles = updated.roles.filter((role) => !previousRoles.has(role));
    const removedRoles = currentMembership.roles.filter((role) => !nextRoles.has(role));

    await createAuditLogEntry(
      {
        actorType: "tenant_member",
        actorId: actor.membershipId,
        tenantId: actor.tenantId,
        action: "tenant_member.roles_changed",
        targetType: "tenant_membership",
        targetId: input.membershipId,
        metadata: { previousRoles: currentMembership.roles, newRoles: updated.roles, assignedRoles, removedRoles },
      },
      client,
    );

    await client.query("COMMIT");
    return updated;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original error for callers.
    }
    if (err instanceof TenantMemberActionError) throw err;
    throw new TenantMemberActionError("Failed to change member roles.", 500, "ACTION_FAILED");
  } finally {
    client.release();
  }
}

export interface SetTenantMemberStatusInput {
  membershipId: string;
  status: TenantMembershipStatus;
}

export async function setTenantMemberStatus(
  input: SetTenantMemberStatusInput,
  actor: TenantAdminActor,
): Promise<TenantMembershipListItem> {
  if (input.membershipId === actor.membershipId) {
    throw new TenantMemberActionError("You cannot change your own status.", 403, "SELF_ACTION_FORBIDDEN");
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    if (input.status === "inactive") {
      const otherAdmins = await countOtherActiveAdmins(actor.tenantId, input.membershipId, client);
      const { rows } = await client.query<{ has_admin: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM tenant_membership_roles tmr
           JOIN role_definitions rd ON rd.id = tmr.role_definition_id AND rd.code = 'admin' AND rd.active = true
           WHERE tmr.membership_id = $1
         ) AS has_admin`,
        [input.membershipId],
      );
      if (rows[0]?.has_admin && otherAdmins === 0) {
        throw new TenantMemberActionError(
          "Cannot disable the temple's only admin.",
          409,
          "LAST_ADMIN_GUARD",
        );
      }
    }

    const updated =
      input.status === "inactive"
        ? await deactivateTenantMembership(actor.tenantId, input.membershipId, client)
        : await reactivateTenantMembership(actor.tenantId, input.membershipId, client);
    if (!updated) {
      throw new TenantMemberActionError("Member not found.", 404, "MEMBER_NOT_FOUND");
    }

    await createAuditLogEntry(
      {
        actorType: "tenant_member",
        actorId: actor.membershipId,
        tenantId: actor.tenantId,
        action: input.status === "inactive" ? "tenant_member.disabled" : "tenant_member.enabled",
        targetType: "tenant_membership",
        targetId: input.membershipId,
        metadata: {},
      },
      client,
    );

    await client.query("COMMIT");
    return updated;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original error for callers.
    }
    if (err instanceof TenantMemberActionError) throw err;
    throw new TenantMemberActionError("Failed to change member status.", 500, "ACTION_FAILED");
  } finally {
    client.release();
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
