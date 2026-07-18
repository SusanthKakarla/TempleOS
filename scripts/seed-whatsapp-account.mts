import "./load-env.mts";
import { getPool } from "../lib/db/pool";
import { getPilotTenant } from "../lib/db/tenants";
import { upsertWhatsAppAccount } from "../lib/db/whatsapp-accounts";
import { normalizePhoneNumber } from "../lib/phone.mts";

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
  const phoneRaw = args.get("phone");
  const phoneNumberId = args.get("phone-number-id");
  const businessAccountId = args.get("business-account-id");

  if (!phoneRaw || !phoneNumberId || !businessAccountId) {
    console.error(
      "Usage: npm run seed:whatsapp -- --phone <temple WhatsApp number> " +
        "--phone-number-id <Meta phone_number_id> --business-account-id <Meta WABA id>",
    );
    process.exitCode = 1;
    return;
  }

  const phone = normalizePhoneNumber(phoneRaw);
  if (!phone) {
    console.error(`"${phoneRaw}" is not a valid phone number.`);
    process.exitCode = 1;
    return;
  }

  const tenant = await getPilotTenant();
  if (!tenant) {
    console.error("No pilot tenant found. Run `npm run migrate` first.");
    process.exitCode = 1;
    return;
  }

  const account = await upsertWhatsAppAccount(tenant.id, {
    phoneNumber: phone,
    metaPhoneNumberId: phoneNumberId,
    metaBusinessAccountId: businessAccountId,
  });

  console.log(
    `Linked WhatsApp number ${account.phoneNumber} (phone_number_id ${account.metaPhoneNumberId}) to tenant "${tenant.name}".`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
