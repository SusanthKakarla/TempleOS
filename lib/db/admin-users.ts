import { getPool } from "./pool";
import type { AdminUser } from "@/types/db";

interface AdminUserRow {
  id: string;
  tenant_id: string;
  phone_number: string;
  display_name: string;
  role: "tenant_admin";
  firebase_uid: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    phoneNumber: row.phone_number,
    displayName: row.display_name,
    role: row.role,
    firebaseUid: row.firebase_uid,
    active: row.active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findActiveAdminByPhone(phoneNumber: string): Promise<AdminUser | null> {
  const { rows } = await getPool().query<AdminUserRow>(
    "SELECT * FROM admin_users WHERE phone_number = $1 AND active = true",
    [phoneNumber],
  );
  return rows[0] ? mapAdminUser(rows[0]) : null;
}

export async function getAdminById(adminId: string): Promise<AdminUser | null> {
  const { rows } = await getPool().query<AdminUserRow>("SELECT * FROM admin_users WHERE id = $1", [
    adminId,
  ]);
  return rows[0] ? mapAdminUser(rows[0]) : null;
}

export async function setAdminFirebaseUid(adminId: string, firebaseUid: string): Promise<void> {
  await getPool().query("UPDATE admin_users SET firebase_uid = $2, updated_at = now() WHERE id = $1", [
    adminId,
    firebaseUid,
  ]);
}

/** Used only by the seed-admin script to allowlist a pilot admin phone number. */
export async function upsertAdminUser(input: {
  tenantId: string;
  phoneNumber: string;
  displayName: string;
}): Promise<AdminUser> {
  const { rows } = await getPool().query<AdminUserRow>(
    `INSERT INTO admin_users (tenant_id, phone_number, display_name, role, active)
     VALUES ($1, $2, $3, 'tenant_admin', true)
     ON CONFLICT (phone_number)
     DO UPDATE SET display_name = EXCLUDED.display_name, active = true, updated_at = now()
     RETURNING *`,
    [input.tenantId, input.phoneNumber, input.displayName],
  );
  return mapAdminUser(rows[0]);
}
