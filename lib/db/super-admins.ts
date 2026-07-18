import { getPool } from "./pool";
import { normalizePhoneNumber } from "../phone.mts";
import type { SuperAdmin } from "@/types/db";

interface SuperAdminRow {
  id: string;
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
    `INSERT INTO super_admins (phone_number, display_name, active)
     VALUES ($1, $2, true)
     ON CONFLICT (phone_number)
     DO UPDATE SET display_name = EXCLUDED.display_name,
                   active = true,
                   updated_at = now()
     RETURNING *`,
    [phoneNumber, displayName],
  );
  return mapSuperAdmin(rows[0]);
}

export async function findActiveSuperAdminByPhone(phoneNumberInput: string): Promise<SuperAdmin | null> {
  const phoneNumber = normalizePhoneNumber(phoneNumberInput);
  if (!phoneNumber) return null;

  const { rows } = await getPool().query<SuperAdminRow>(
    "SELECT * FROM super_admins WHERE phone_number = $1 AND active = true LIMIT 1",
    [phoneNumber],
  );
  return rows[0] ? mapSuperAdmin(rows[0]) : null;
}

export async function getSuperAdminById(id: string): Promise<SuperAdmin | null> {
  const { rows } = await getPool().query<SuperAdminRow>(
    "SELECT * FROM super_admins WHERE id = $1 LIMIT 1",
    [id],
  );
  return rows[0] ? mapSuperAdmin(rows[0]) : null;
}

export async function bindSuperAdminFirebaseUid(
  superAdminId: string,
  firebaseUid: string,
): Promise<boolean> {
  const result = await getPool().query<{ id: string }>(
    `UPDATE super_admins
     SET firebase_uid = $2,
         updated_at = now()
     WHERE id = $1
       AND active = true
       AND (firebase_uid IS NULL OR firebase_uid = $2)
       AND NOT EXISTS (
         SELECT 1
         FROM super_admins existing
         WHERE existing.firebase_uid = $2
           AND existing.id <> $1
           AND existing.active = true
       )
     RETURNING id`,
    [superAdminId, firebaseUid],
  );
  return (result.rowCount ?? result.rows.length) > 0;
}
