import { getPool } from "./pool";
import type { AdminRole, AdminUser } from "@/types/db";

interface AdminUserRow {
  id: string;
  tenant_id: string;
  phone_number: string;
  display_name: string;
  role: AdminRole;
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

/** Used by the CLI seed scripts (break-glass provisioning outside the app). */
export async function upsertAdminUser(input: {
  tenantId: string;
  phoneNumber: string;
  displayName: string;
  role: AdminRole;
}): Promise<AdminUser> {
  const { rows } = await getPool().query<AdminUserRow>(
    `INSERT INTO admin_users (tenant_id, phone_number, display_name, role, active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (phone_number)
     DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role, active = true, updated_at = now()
     RETURNING *`,
    [input.tenantId, input.phoneNumber, input.displayName, input.role],
  );
  return mapAdminUser(rows[0]);
}

export async function listAdmins(tenantId: string): Promise<AdminUser[]> {
  const { rows } = await getPool().query<AdminUserRow>(
    "SELECT * FROM admin_users WHERE tenant_id = $1 ORDER BY created_at ASC",
    [tenantId],
  );
  return rows.map(mapAdminUser);
}

export async function countSuperAdmins(tenantId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    "SELECT count(*) FROM admin_users WHERE tenant_id = $1 AND role = 'super_admin' AND active = true",
    [tenantId],
  );
  return Number(rows[0].count);
}

/** Provisioning through the in-app Admin Management UI (Super Admin only). */
export async function createAdmin(
  tenantId: string,
  input: { phoneNumber: string; displayName: string; role: AdminRole },
): Promise<AdminUser> {
  const { rows } = await getPool().query<AdminUserRow>(
    `INSERT INTO admin_users (tenant_id, phone_number, display_name, role, active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING *`,
    [tenantId, input.phoneNumber, input.displayName, input.role],
  );
  return mapAdminUser(rows[0]);
}

export async function updateAdminRole(
  tenantId: string,
  adminId: string,
  role: AdminRole,
): Promise<AdminUser | null> {
  const { rows } = await getPool().query<AdminUserRow>(
    `UPDATE admin_users SET role = $3, updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, adminId, role],
  );
  return rows[0] ? mapAdminUser(rows[0]) : null;
}

export async function deleteAdminById(tenantId: string, adminId: string): Promise<boolean> {
  const result = await getPool().query("DELETE FROM admin_users WHERE tenant_id = $1 AND id = $2", [
    tenantId,
    adminId,
  ]);
  return (result.rowCount ?? 0) > 0;
}
