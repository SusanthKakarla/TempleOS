import "./load-env.mts";
import { getPool } from "../lib/db/pool";
import { seedV0RoleDefinitions } from "../lib/db/role-definitions";
import { seedNotificationTemplates } from "../lib/db/notification-templates";
import { seedFeatureCatalog } from "../lib/db/features";
import { upsertFirstSuperAdmin } from "../lib/db/super-admins";

/**
 * Idempotent platform bootstrap. Safe to run on every deploy.
 *
 * The optional first super-admin seed is driven by env so deployments can
 * create the initial platform actor without attaching them to any tenant.
 */
async function main() {
  const roles = await seedV0RoleDefinitions();
  console.log(`Seeded ${roles.length} V0 role definitions.`);

  const templates = await seedNotificationTemplates();
  console.log(`Seeded ${templates.length} notification templates.`);

  const features = await seedFeatureCatalog();
  console.log(`Seeded ${features.length} platform features.`);

  const phoneNumber = process.env.SUPER_ADMIN_PHONE_NUMBER;
  if (!phoneNumber) {
    console.warn(
      "SUPER_ADMIN_PHONE_NUMBER is not set — skipping first Super Admin bootstrap. " +
        "Run `npm run seed:super-admin -- --phone <phone> --name <name>` when ready.",
    );
    return;
  }

  const superAdmin = await upsertFirstSuperAdmin({
    phoneNumber,
    displayName: process.env.SUPER_ADMIN_DISPLAY_NAME ?? "Super Admin",
  });
  console.log(`Bootstrapped Super Admin "${superAdmin.displayName}" (${superAdmin.phoneNumber}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
