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
