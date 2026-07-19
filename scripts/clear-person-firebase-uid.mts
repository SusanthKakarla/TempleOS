import "./load-env.mts";
import { clearPersonFirebaseUidByPhone } from "../lib/db/persons";
import { getPool } from "../lib/db/pool";

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
  const phoneNumber = args.get("phone");

  if (!phoneNumber) {
    console.error("Usage: tsx scripts/clear-person-firebase-uid.mts --phone <phone>");
    process.exitCode = 1;
    return;
  }

  const person = await clearPersonFirebaseUidByPhone(phoneNumber);
  if (!person) {
    console.error("No person found for that phone number.");
    process.exitCode = 1;
    return;
  }

  console.log(
    `Cleared Firebase UID binding for person ${person.id} (${person.phoneNumber}). Verify phone ownership before reuse.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
