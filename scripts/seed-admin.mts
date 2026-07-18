import "./load-env.mts";
import { getPool } from "../lib/db/pool";
import { getPilotTenant, updateTenant } from "../lib/db/tenants";
import { normalizePhoneNumber } from "../lib/phone.mts";
import { isGenericTenantHostname, normalizeTenantHostname } from "../lib/tenant-domains";
import { isRoleCode, type RoleCode } from "../types/db";

function parseArgs(): Map<string, string> {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      map.set(arg.slice(2), args[i + 1] ?? "");
      i += 1;
    }
  }
  return map;
}

async function main() {
  const args = parseArgs();
  const adminPhoneRaw = args.get("phone");
  const adminName = args.get("name") ?? "Temple Admin";
  const tenantHostRaw = args.get("tenant-host") ?? process.env.TEMPLEOS_LOCAL_TENANT_HOST;

  if (!adminPhoneRaw || !tenantHostRaw) {
    console.error(
      "Usage: npm run seed:admin -- --phone <phone> --tenant-host <hostname> " +
        "[--name <name>] [--roles admin,priest] [--tenant-name <name>] " +
        "[--tenant-phone <phone>] [--tenant-address <address>] [--tenant-timezone <tz>]",
    );
    process.exitCode = 1;
    return;
  }

  const adminPhone = normalizePhoneNumber(adminPhoneRaw);
  if (!adminPhone) {
    console.error(`"${adminPhoneRaw}" is not a valid phone number.`);
    process.exitCode = 1;
    return;
  }

  const tenantHost = normalizeTenantHostname(tenantHostRaw);
  if (!tenantHost || isGenericTenantHostname(tenantHost)) {
    console.error(`"${tenantHostRaw}" is not a valid tenant hostname.`);
    process.exitCode = 1;
    return;
  }

  const roles = parseRoleCodes(args.get("roles") ?? args.get("role") ?? "admin");
  if (!roles) {
    process.exitCode = 1;
    return;
  }

  const tenant = await getPilotTenant();
  if (!tenant) {
    console.error("No pilot tenant found. Run `npm run migrate` first.");
    process.exitCode = 1;
    return;
  }

  const tenantName = args.get("tenant-name");
  const tenantPhone = args.get("tenant-phone");
  const tenantAddress = args.get("tenant-address");
  const tenantTimezone = args.get("tenant-timezone");

  if (tenantName || tenantPhone || tenantAddress || tenantTimezone) {
    await updateTenant(tenant.id, {
      name: tenantName,
      defaultContactPhone: tenantPhone,
      address: tenantAddress,
      timezone: tenantTimezone,
    });
    console.log("Updated pilot tenant details.");
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const domainResult = await client.query<{ tenant_id: string }>(
      `INSERT INTO tenant_domains (tenant_id, hostname, kind, status)
       VALUES ($1, $2, 'primary', 'active')
       ON CONFLICT (hostname)
       DO UPDATE SET kind = EXCLUDED.kind,
                     status = EXCLUDED.status,
                     updated_at = now()
       RETURNING tenant_id`,
      [tenant.id, tenantHost],
    );
    if (domainResult.rows[0]?.tenant_id !== tenant.id) {
      throw new Error(`Tenant host "${tenantHost}" already belongs to another tenant.`);
    }

    const personResult = await client.query<{ id: string }>(
      `INSERT INTO persons (phone_number, display_name)
       VALUES ($1, $2)
       ON CONFLICT (phone_number)
       DO UPDATE SET display_name = EXCLUDED.display_name,
                     updated_at = now()
       RETURNING id`,
      [adminPhone, adminName],
    );
    const personId = personResult.rows[0]?.id;
    if (!personId) {
      throw new Error(`Failed to upsert person for ${adminPhone}.`);
    }

    const membershipResult = await client.query<{ id: string }>(
      `INSERT INTO tenant_memberships (tenant_id, person_id, display_name, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (tenant_id, person_id)
       DO UPDATE SET display_name = EXCLUDED.display_name,
                     status = EXCLUDED.status,
                     updated_at = now()
       RETURNING id`,
      [tenant.id, personId, adminName],
    );
    const membershipId = membershipResult.rows[0]?.id;
    if (!membershipId) {
      throw new Error(`Failed to upsert tenant membership for ${adminPhone}.`);
    }

    const roleResult = await client.query<{ id: string; code: RoleCode }>(
      `SELECT id, code
       FROM role_definitions
       WHERE code = ANY($1::text[]) AND active = true`,
      [roles],
    );
    const foundRoleCodes = new Set(roleResult.rows.map((role) => role.code));
    const missingRoleCodes = roles.filter((role) => !foundRoleCodes.has(role));
    if (missingRoleCodes.length > 0) {
      throw new Error(`Missing active role definitions: ${missingRoleCodes.join(", ")}`);
    }

    await client.query("DELETE FROM tenant_membership_roles WHERE membership_id = $1", [
      membershipId,
    ]);
    for (const role of roleResult.rows) {
      await client.query(
        `INSERT INTO tenant_membership_roles (membership_id, role_definition_id)
         VALUES ($1, $2)`,
        [membershipId, role.id],
      );
    }

    await client.query("COMMIT");
    console.log(
      `Allowlisted "${adminName}" (${adminPhone}) for tenant "${tenant.name}" at ${tenantHost} with roles ${roles.join(", ")}.`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function parseRoleCodes(rawRoles: string): RoleCode[] | null {
  const roles = rawRoles
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  if (roles.length === 0 || !roles.every(isRoleCode)) {
    console.error(`--roles must be one or more V0 role codes, got "${rawRoles}".`);
    return null;
  }
  return Array.from(new Set(roles));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
