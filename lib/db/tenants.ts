import { getPool } from "./pool";
import type { Tenant } from "@/types/db";

interface TenantRow {
  id: string;
  name: string;
  default_contact_phone: string | null;
  address: string | null;
  timezone: string;
  welcome_message: string | null;
  description: string | null;
  history: string | null;
  contact_email: string | null;
  google_maps_link: string | null;
  morning_open: string | null;
  morning_close: string | null;
  evening_open: string | null;
  evening_close: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    defaultContactPhone: row.default_contact_phone,
    address: row.address,
    timezone: row.timezone,
    welcomeMessage: row.welcome_message,
    description: row.description,
    history: row.history,
    contactEmail: row.contact_email,
    googleMapsLink: row.google_maps_link,
    morningOpen: row.morning_open,
    morningClose: row.morning_close,
    eveningOpen: row.evening_open,
    eveningClose: row.evening_close,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** The MVP supports exactly one tenant; this is the canonical lookup for it. */
export async function getPilotTenant(): Promise<Tenant | null> {
  const { rows } = await getPool().query<TenantRow>(
    "SELECT * FROM tenants ORDER BY created_at ASC LIMIT 1",
  );
  return rows[0] ? mapTenant(rows[0]) : null;
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const { rows } = await getPool().query<TenantRow>("SELECT * FROM tenants WHERE id = $1", [
    tenantId,
  ]);
  return rows[0] ? mapTenant(rows[0]) : null;
}

export type UpdateTenantInput = Partial<
  Pick<
    Tenant,
    | "name"
    | "defaultContactPhone"
    | "address"
    | "timezone"
    | "welcomeMessage"
    | "description"
    | "history"
    | "contactEmail"
    | "googleMapsLink"
    | "morningOpen"
    | "morningClose"
    | "eveningOpen"
    | "eveningClose"
  >
>;

/**
 * Every optional field uses a "was this actually provided" CASE-WHEN pattern
 * rather than COALESCE, so a caller can explicitly clear a field back to
 * null — required for the Chatbot Settings page, which is the first caller
 * that needs to clear e.g. welcome_message, not just set it.
 *
 * Deliberately checks `fields.x !== undefined` rather than the `"x" in
 * fields` pattern used in lib/db/events.ts/donations.ts: those repos are
 * only ever called with a `req.json()`-parsed body, where JSON serialization
 * already drops undefined-valued keys, so the two checks are equivalent
 * there. updateTenant also has a direct, non-HTTP caller (scripts/seed-admin.mts)
 * that builds a plain object literal with possibly-undefined values — for
 * that caller "x" in fields is always true, which would silently null out
 * every field it didn't intend to touch. `!== undefined` handles both
 * calling conventions correctly.
 */
export async function updateTenant(tenantId: string, fields: UpdateTenantInput): Promise<Tenant> {
  const { rows } = await getPool().query<TenantRow>(
    `UPDATE tenants
     SET name = COALESCE($2, name),
         default_contact_phone = CASE WHEN $3::boolean THEN $4 ELSE default_contact_phone END,
         address = CASE WHEN $5::boolean THEN $6 ELSE address END,
         timezone = COALESCE($7, timezone),
         welcome_message = CASE WHEN $8::boolean THEN $9 ELSE welcome_message END,
         description = CASE WHEN $10::boolean THEN $11 ELSE description END,
         history = CASE WHEN $12::boolean THEN $13 ELSE history END,
         contact_email = CASE WHEN $14::boolean THEN $15 ELSE contact_email END,
         google_maps_link = CASE WHEN $16::boolean THEN $17 ELSE google_maps_link END,
         morning_open = CASE WHEN $18::boolean THEN $19::time ELSE morning_open END,
         morning_close = CASE WHEN $20::boolean THEN $21::time ELSE morning_close END,
         evening_open = CASE WHEN $22::boolean THEN $23::time ELSE evening_open END,
         evening_close = CASE WHEN $24::boolean THEN $25::time ELSE evening_close END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      tenantId,
      fields.name ?? null,
      fields.defaultContactPhone !== undefined,
      fields.defaultContactPhone ?? null,
      fields.address !== undefined,
      fields.address ?? null,
      fields.timezone ?? null,
      fields.welcomeMessage !== undefined,
      fields.welcomeMessage ?? null,
      fields.description !== undefined,
      fields.description ?? null,
      fields.history !== undefined,
      fields.history ?? null,
      fields.contactEmail !== undefined,
      fields.contactEmail ?? null,
      fields.googleMapsLink !== undefined,
      fields.googleMapsLink ?? null,
      fields.morningOpen !== undefined,
      fields.morningOpen ?? null,
      fields.morningClose !== undefined,
      fields.morningClose ?? null,
      fields.eveningOpen !== undefined,
      fields.eveningOpen ?? null,
      fields.eveningClose !== undefined,
      fields.eveningClose ?? null,
    ],
  );
  return mapTenant(rows[0]);
}
