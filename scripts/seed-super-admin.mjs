import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import parsePhoneNumberFromString from "libphonenumber-js";

for (const envFile of [".env", ".env.local"]) {
  const path = resolve(process.cwd(), envFile);
  if (existsSync(path)) {
    loadDotenv({ path, override: false, quiet: true });
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const map = new Map();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      map.set(arg.slice(2), args[i + 1] ?? "");
      i += 1;
    }
  }
  return map;
}

function normalizePhoneNumber(raw) {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const parsed = parsePhoneNumberFromString(cleaned, { defaultCountry: "IN" });
  return parsed && parsed.isValid() ? parsed.number : null;
}

function needsSSL(connectionString) {
  return !/localhost|127\.0\.0\.1|\.railway\.internal/.test(connectionString);
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    ssl: needsSSL(connectionString) ? { rejectUnauthorized: false } : false,
  });
}

async function upsertFirstSuperAdmin(pool, input) {
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  if (!phoneNumber) {
    throw new Error("Enter a valid phone number.");
  }

  const displayName = input.displayName.trim() || "Super Admin";
  const existing = await pool.query(
    "SELECT * FROM super_admins WHERE active = true ORDER BY created_at ASC LIMIT 1",
  );
  if (existing.rows[0] && existing.rows[0].phone_number !== phoneNumber) {
    throw new Error(
      `A Super Admin already exists (${existing.rows[0].phone_number}). Use a dedicated add-admin flow for additional platform admins.`,
    );
  }

  const { rows } = await pool.query(
    `WITH person_row AS (
       INSERT INTO persons (phone_number, display_name)
       VALUES ($1, $2)
       ON CONFLICT (phone_number)
       DO UPDATE SET phone_number = EXCLUDED.phone_number
       RETURNING id
     ),
     super_admin_row AS (
       INSERT INTO super_admins (phone_number, display_name, person_id, active)
       SELECT $1, $2, person_row.id, true
       FROM person_row
       ON CONFLICT (phone_number)
       DO UPDATE SET display_name = EXCLUDED.display_name,
                     person_id = EXCLUDED.person_id,
                     active = true,
                     updated_at = now()
       RETURNING *
     )
     SELECT *
     FROM super_admin_row`,
    [phoneNumber, displayName],
  );
  return rows[0];
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

  const pool = createPool();
  try {
    const superAdmin = await upsertFirstSuperAdmin(pool, { phoneNumber, displayName });
    console.log(`Bootstrapped Super Admin "${superAdmin.display_name}" (${superAdmin.phone_number}).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  const message =
    err instanceof AggregateError
      ? err.errors.map((error) => error?.message).filter(Boolean).join("\n")
      : err instanceof Error
        ? err.message || err.stack
        : "Failed to bootstrap Super Admin.";
  console.error(message);
  process.exitCode = 1;
});
