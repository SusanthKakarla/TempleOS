import "./load-env.mts";
import { getPool } from "../lib/db/pool";
import { upsertFirstSuperAdmin } from "../lib/db/super-admins";

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
  const phoneNumber = args.get("phone") ?? process.env.SUPER_ADMIN_PHONE_NUMBER;
  const displayName = args.get("name") ?? process.env.SUPER_ADMIN_DISPLAY_NAME ?? "Super Admin";

  if (!phoneNumber) {
    console.error(
      "Usage: npm run seed:super-admin -- --phone <phone> --name <name>\n" +
        "Or set SUPER_ADMIN_PHONE_NUMBER and SUPER_ADMIN_DISPLAY_NAME.",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const superAdmin = await upsertFirstSuperAdmin({ phoneNumber, displayName });
    console.log(`Bootstrapped Super Admin "${superAdmin.displayName}" (${superAdmin.phoneNumber}).`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to bootstrap Super Admin.";
    console.error(message);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
