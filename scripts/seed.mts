import { config } from "dotenv";
import { getPool } from "../lib/db/pool";
import { getPilotTenant } from "../lib/db/tenants";
import { countSuperAdmins, upsertAdminUser } from "../lib/db/admin-users";
import { normalizePhoneNumber } from "../lib/phone.mts";

config({ path: ".env.local", quiet: true });

/**
 * Idempotent bootstrap: creates the initial Super Admin from ADMIN_PHONE_NUMBER
 * if (and only if) no Super Admin exists yet for the pilot tenant. Safe to run
 * on every deploy — `npm run seed`.
 */
async function main() {
  const tenant = await getPilotTenant();
  if (!tenant) {
    console.error("No pilot tenant found. Run `npm run migrate` first.");
    process.exitCode = 1;
    return;
  }

  const existing = await countSuperAdmins(tenant.id);
  if (existing > 0) {
    console.log(`Super Admin already provisioned for "${tenant.name}" — nothing to do.`);
    return;
  }

  const adminPhoneRaw = process.env.ADMIN_PHONE_NUMBER;
  if (!adminPhoneRaw) {
    console.warn(
      "No Super Admin exists yet and ADMIN_PHONE_NUMBER is not set — skipping bootstrap. " +
        "Set ADMIN_PHONE_NUMBER and rerun `npm run seed`, or use `npm run seed:admin` directly.",
    );
    return;
  }

  const adminPhone = normalizePhoneNumber(adminPhoneRaw);
  if (!adminPhone) {
    console.error(`ADMIN_PHONE_NUMBER "${adminPhoneRaw}" is not a valid phone number.`);
    process.exitCode = 1;
    return;
  }

  const displayName = process.env.ADMIN_DISPLAY_NAME ?? "Super Admin";
  const admin = await upsertAdminUser({
    tenantId: tenant.id,
    phoneNumber: adminPhone,
    displayName,
    role: "super_admin",
  });

  console.log(`Bootstrapped Super Admin "${admin.displayName}" (${admin.phoneNumber}) for "${tenant.name}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
