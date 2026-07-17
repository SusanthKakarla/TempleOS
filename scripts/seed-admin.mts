import { config } from "dotenv";
import { getPool } from "../lib/db/pool";
import { getPilotTenant, updateTenant } from "../lib/db/tenants";
import { upsertAdminUser } from "../lib/db/admin-users";
import { normalizePhoneNumber } from "../lib/phone.mts";
import type { AdminRole } from "../types/db";

config({ path: ".env.local", quiet: true });

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

  if (!adminPhoneRaw) {
    console.error(
      "Usage: npm run seed:admin -- --phone <phone> [--name <name>] [--role super_admin|admin] " +
        "[--tenant-name <name>] [--tenant-phone <phone>] [--tenant-address <address>] [--tenant-timezone <tz>]",
    );
    process.exitCode = 1;
    return;
  }

  const roleArg = args.get("role") ?? "super_admin";
  if (roleArg !== "super_admin" && roleArg !== "admin") {
    console.error(`--role must be "super_admin" or "admin", got "${roleArg}".`);
    process.exitCode = 1;
    return;
  }
  const role = roleArg as AdminRole;

  const adminPhone = normalizePhoneNumber(adminPhoneRaw);
  if (!adminPhone) {
    console.error(`"${adminPhoneRaw}" is not a valid phone number.`);
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

  const admin = await upsertAdminUser({
    tenantId: tenant.id,
    phoneNumber: adminPhone,
    displayName: adminName,
    role,
  });

  console.log(
    `Allowlisted ${admin.role} "${admin.displayName}" (${admin.phoneNumber}) for tenant "${tenant.name}".`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
