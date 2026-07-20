import { getPool } from "./pool";
import { normalizePhoneNumber } from "../phone.mts";
import type { SuperAdmin } from "@/types/db";

interface SuperAdminRow {
  id: string;
  person_id: string;
  phone_number: string;
  display_name: string;
  firebase_uid: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapSuperAdmin(row: SuperAdminRow): SuperAdmin {
  return {
    id: row.id,
    personId: row.person_id,
    phoneNumber: row.phone_number,
    displayName: row.display_name,
    firebaseUid: row.firebase_uid,
    active: row.active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function upsertFirstSuperAdmin(input: {
  phoneNumber: string;
  displayName: string;
}): Promise<SuperAdmin> {
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  if (!phoneNumber) {
    throw new Error("Enter a valid phone number.");
  }

  const displayName = input.displayName.trim() || "Super Admin";
  const existing = await getPool().query<SuperAdminRow>(
    "SELECT * FROM super_admins WHERE active = true ORDER BY created_at ASC LIMIT 1",
  );
  if (existing.rows[0] && existing.rows[0].phone_number !== phoneNumber) {
    throw new Error(
      `A Super Admin already exists (${existing.rows[0].phone_number}). Use a dedicated add-admin flow for additional platform admins.`,
    );
  }

  const { rows } = await getPool().query<SuperAdminRow>(
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
     SELECT sa.id,
            sa.person_id,
            sa.phone_number,
            sa.display_name,
            p.firebase_uid,
            sa.active,
            sa.created_at,
            sa.updated_at
     FROM super_admin_row sa
     JOIN persons p ON p.id = sa.person_id`,
    [phoneNumber, displayName],
  );
  return mapSuperAdmin(rows[0]);
}

export async function listActiveSuperAdmins(): Promise<SuperAdmin[]> {
  const { rows } = await getPool().query<SuperAdminRow>(
    `SELECT sa.id,
            sa.person_id,
            sa.phone_number,
            sa.display_name,
            p.firebase_uid,
            sa.active,
            sa.created_at,
            sa.updated_at
     FROM super_admins sa
     JOIN persons p ON p.id = sa.person_id
     WHERE sa.active = true
     ORDER BY sa.created_at ASC`,
  );
  return rows.map(mapSuperAdmin);
}

/**
 * Adds (or reactivates) a Super Admin without the single-admin guard that
 * `upsertFirstSuperAdmin` enforces — used once a first Super Admin already
 * exists and another platform admin needs to be added alongside them.
 */
export async function addSuperAdmin(input: {
  phoneNumber: string;
  displayName: string;
}): Promise<SuperAdmin> {
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  if (!phoneNumber) {
    throw new Error("Enter a valid phone number.");
  }

  const displayName = input.displayName.trim() || "Super Admin";
  const { rows } = await getPool().query<SuperAdminRow>(
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
     SELECT sa.id,
            sa.person_id,
            sa.phone_number,
            sa.display_name,
            p.firebase_uid,
            sa.active,
            sa.created_at,
            sa.updated_at
     FROM super_admin_row sa
     JOIN persons p ON p.id = sa.person_id`,
    [phoneNumber, displayName],
  );
  return mapSuperAdmin(rows[0]);
}

/** Refuses to deactivate the last active Super Admin so the platform can never be fully locked out. */
export async function deactivateSuperAdmin(id: string): Promise<SuperAdmin> {
  const target = await getSuperAdminById(id);
  if (!target || !target.active) {
    throw new Error("Super Admin not found or already inactive.");
  }

  const { rows } = await getPool().query<SuperAdminRow>(
    `UPDATE super_admins sa
     SET active = false, updated_at = now()
     FROM persons p
     WHERE sa.id = $1
       AND sa.person_id = p.id
       AND sa.active = true
       AND (SELECT count(*) FROM super_admins WHERE active = true) > 1
     RETURNING sa.id,
               sa.person_id,
               sa.phone_number,
               sa.display_name,
               p.firebase_uid,
               sa.active,
               sa.created_at,
               sa.updated_at`,
    [id],
  );

  if (!rows[0]) {
    throw new Error("Cannot deactivate the last active Super Admin.");
  }
  return mapSuperAdmin(rows[0]);
}

export async function findActiveSuperAdminByPhone(phoneNumberInput: string): Promise<SuperAdmin | null> {
  const phoneNumber = normalizePhoneNumber(phoneNumberInput);
  if (!phoneNumber) return null;

  const { rows } = await getPool().query<SuperAdminRow>(
    `SELECT sa.id,
            sa.person_id,
            sa.phone_number,
            sa.display_name,
            p.firebase_uid,
            sa.active,
            sa.created_at,
            sa.updated_at
     FROM super_admins sa
     JOIN persons p ON p.id = sa.person_id
     WHERE sa.phone_number = $1 AND sa.active = true
     LIMIT 1`,
    [phoneNumber],
  );
  return rows[0] ? mapSuperAdmin(rows[0]) : null;
}

export async function getSuperAdminById(id: string): Promise<SuperAdmin | null> {
  const { rows } = await getPool().query<SuperAdminRow>(
    `SELECT sa.id,
            sa.person_id,
            sa.phone_number,
            sa.display_name,
            p.firebase_uid,
            sa.active,
            sa.created_at,
            sa.updated_at
     FROM super_admins sa
     JOIN persons p ON p.id = sa.person_id
     WHERE sa.id = $1
     LIMIT 1`,
    [id],
  );
  return rows[0] ? mapSuperAdmin(rows[0]) : null;
}

export async function bindSuperAdminFirebaseUid(
  superAdminId: string,
  firebaseUid: string,
): Promise<boolean> {
  try {
    const result = await getPool().query<{ id: string }>(
      `UPDATE persons p
       SET firebase_uid = $2,
           updated_at = now()
       FROM super_admins sa
       WHERE sa.id = $1
         AND sa.active = true
         AND sa.person_id = p.id
         AND (p.firebase_uid IS NULL OR p.firebase_uid = $2)
         AND NOT EXISTS (
           SELECT 1
           FROM persons existing
           WHERE existing.firebase_uid = $2
             AND existing.id <> p.id
         )
       RETURNING p.id`,
      [superAdminId, firebaseUid],
    );
    return (result.rowCount ?? result.rows.length) > 0;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
