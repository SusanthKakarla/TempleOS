import { getPool } from "./pool";
import type { Devotee, SupportedLanguage } from "@/types/db";

interface DevoteeRow {
  id: string;
  tenant_id: string;
  whatsapp_phone: string;
  display_name: string;
  date_of_birth: string | null;
  birth_star: string | null;
  ancestral_lineage: string | null;
  first_seen_at: Date;
  last_seen_at: Date;
  last_interaction_type: string | null;
  whatsapp_opt_in_status: boolean;
  preferred_language: string | null;
  is_donor: boolean;
  total_donated_amount: string;
  last_donation_at: Date | null;
  event_notifications_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapDevotee(row: DevoteeRow): Devotee {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    whatsappPhone: row.whatsapp_phone,
    displayName: row.display_name,
    dateOfBirth: row.date_of_birth,
    birthStar: row.birth_star,
    ancestralLineage: row.ancestral_lineage,
    firstSeenAt: row.first_seen_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    lastInteractionType: row.last_interaction_type,
    whatsappOptInStatus: row.whatsapp_opt_in_status,
    preferredLanguage: row.preferred_language as SupportedLanguage | null,
    isDonor: row.is_donor,
    totalDonatedAmount: row.total_donated_amount,
    lastDonationAt: row.last_donation_at ? row.last_donation_at.toISOString() : null,
    eventNotificationsEnabled: row.event_notifications_enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listDevotees(tenantId: string, search?: string): Promise<Devotee[]> {
  if (search && search.trim()) {
    const { rows } = await getPool().query<DevoteeRow>(
      `SELECT * FROM devotees
       WHERE tenant_id = $1 AND (display_name ILIKE $2 OR whatsapp_phone ILIKE $2)
       ORDER BY display_name ASC`,
      [tenantId, `%${search.trim()}%`],
    );
    return rows.map(mapDevotee);
  }

  const { rows } = await getPool().query<DevoteeRow>(
    "SELECT * FROM devotees WHERE tenant_id = $1 ORDER BY display_name ASC",
    [tenantId],
  );
  return rows.map(mapDevotee);
}

/** Dashboard "Recent Devotees" widget. */
export async function listRecentDevotees(tenantId: string, limit = 5): Promise<Devotee[]> {
  const { rows } = await getPool().query<DevoteeRow>(
    "SELECT * FROM devotees WHERE tenant_id = $1 ORDER BY first_seen_at DESC LIMIT $2",
    [tenantId, limit],
  );
  return rows.map(mapDevotee);
}

/** Recipients for "Send WhatsApp announcement" — only devotees who opted in via inbound WhatsApp. */
export async function listOptedInDevotees(tenantId: string): Promise<Devotee[]> {
  const { rows } = await getPool().query<DevoteeRow>(
    "SELECT * FROM devotees WHERE tenant_id = $1 AND whatsapp_opt_in_status = true ORDER BY display_name ASC",
    [tenantId],
  );
  return rows.map(mapDevotee);
}

export async function getDevoteeById(tenantId: string, devoteeId: string): Promise<Devotee | null> {
  const { rows } = await getPool().query<DevoteeRow>(
    "SELECT * FROM devotees WHERE tenant_id = $1 AND id = $2",
    [tenantId, devoteeId],
  );
  return rows[0] ? mapDevotee(rows[0]) : null;
}

export async function getDevoteeByPhone(
  tenantId: string,
  whatsappPhone: string,
): Promise<Devotee | null> {
  const { rows } = await getPool().query<DevoteeRow>(
    "SELECT * FROM devotees WHERE tenant_id = $1 AND whatsapp_phone = $2",
    [tenantId, whatsappPhone],
  );
  return rows[0] ? mapDevotee(rows[0]) : null;
}

export interface CreateDevoteeInput {
  whatsappPhone: string;
  displayName: string;
  dateOfBirth: string | null;
  birthStar: string | null;
  ancestralLineage: string | null;
}

/** Manually added devotees default to not opted in until they message the temple number. */
export async function createDevotee(
  tenantId: string,
  input: CreateDevoteeInput,
): Promise<Devotee> {
  const { rows } = await getPool().query<DevoteeRow>(
    `INSERT INTO devotees
       (tenant_id, whatsapp_phone, display_name, date_of_birth, birth_star, ancestral_lineage, whatsapp_opt_in_status)
     VALUES ($1, $2, $3, $4, $5, $6, false)
     RETURNING *`,
    [
      tenantId,
      input.whatsappPhone,
      input.displayName,
      input.dateOfBirth,
      input.birthStar,
      input.ancestralLineage,
    ],
  );
  return mapDevotee(rows[0]);
}

export interface UpsertDevoteeFromWhatsAppInput {
  whatsappPhone: string;
  displayName: string;
  lastInteractionType: string;
}

/**
 * Called from the inbound WhatsApp webhook. Auto-creates a new devotee opted
 * in, or reuses an existing one, refreshing last-seen/interaction without
 * touching a display name an admin may have already edited.
 */
export async function upsertDevoteeFromWhatsApp(
  tenantId: string,
  input: UpsertDevoteeFromWhatsAppInput,
): Promise<Devotee> {
  const { rows } = await getPool().query<DevoteeRow>(
    `INSERT INTO devotees
       (tenant_id, whatsapp_phone, display_name, whatsapp_opt_in_status, last_interaction_type, first_seen_at, last_seen_at)
     VALUES ($1, $2, $3, true, $4, now(), now())
     ON CONFLICT (tenant_id, whatsapp_phone)
     DO UPDATE SET
       whatsapp_opt_in_status = true,
       last_interaction_type = EXCLUDED.last_interaction_type,
       last_seen_at = now(),
       updated_at = now()
     RETURNING *`,
    [tenantId, input.whatsappPhone, input.displayName, input.lastInteractionType],
  );
  return mapDevotee(rows[0]);
}

/**
 * Called only from the WhatsApp bot's language picker — a plain, unambiguous
 * write (always a concrete non-null value), so it bypasses the generic
 * updateDevotee()/UpdateDevoteeInput CASE-WHEN machinery built for the admin
 * dashboard's ambiguous partial-update case (was a field provided at all?).
 */
export async function updateDevoteePreferredLanguage(
  tenantId: string,
  devoteeId: string,
  language: SupportedLanguage,
): Promise<Devotee | null> {
  const { rows } = await getPool().query<DevoteeRow>(
    `UPDATE devotees SET preferred_language = $3, updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, devoteeId, language],
  );
  return rows[0] ? mapDevotee(rows[0]) : null;
}

export interface UpdateDevoteeInput {
  whatsappPhone?: string;
  displayName?: string;
  dateOfBirth?: string | null;
  birthStar?: string | null;
  ancestralLineage?: string | null;
  eventNotificationsEnabled?: boolean;
}

export async function updateDevotee(
  tenantId: string,
  devoteeId: string,
  input: UpdateDevoteeInput,
): Promise<Devotee | null> {
  const { rows } = await getPool().query<DevoteeRow>(
    `UPDATE devotees
     SET whatsapp_phone = COALESCE($3, whatsapp_phone),
         display_name = COALESCE($4, display_name),
         date_of_birth = CASE WHEN $5::boolean THEN $6 ELSE date_of_birth END,
         birth_star = CASE WHEN $7::boolean THEN $8 ELSE birth_star END,
         ancestral_lineage = CASE WHEN $9::boolean THEN $10 ELSE ancestral_lineage END,
         event_notifications_enabled = COALESCE($11::boolean, event_notifications_enabled),
         updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      tenantId,
      devoteeId,
      input.whatsappPhone ?? null,
      input.displayName ?? null,
      "dateOfBirth" in input,
      input.dateOfBirth ?? null,
      "birthStar" in input,
      input.birthStar ?? null,
      "ancestralLineage" in input,
      input.ancestralLineage ?? null,
      input.eventNotificationsEnabled ?? null,
    ],
  );
  return rows[0] ? mapDevotee(rows[0]) : null;
}

/**
 * WhatsApp message/interaction history rows referencing this devotee are
 * kept (their devotee_id column is nullable and ON DELETE SET NULL) — only
 * the devotee record itself is removed. Donation history has no such
 * fallback (devotee_id there is required, no ON DELETE action), so deleting
 * a devotee with donations fails with a foreign key violation; the caller
 * (the API route) turns that into a friendly 409.
 */
export async function deleteDevotee(tenantId: string, devoteeId: string): Promise<boolean> {
  const result = await getPool().query("DELETE FROM devotees WHERE tenant_id = $1 AND id = $2", [
    tenantId,
    devoteeId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function countDevotees(tenantId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    "SELECT count(*) FROM devotees WHERE tenant_id = $1",
    [tenantId],
  );
  return Number(rows[0].count);
}

export async function countOptedInDevotees(tenantId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    "SELECT count(*) FROM devotees WHERE tenant_id = $1 AND whatsapp_opt_in_status = true",
    [tenantId],
  );
  return Number(rows[0].count);
}
