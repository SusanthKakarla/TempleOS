import { forbidden } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import type { SuperAdmin } from "@/types/db";

export async function requireSuperAdminPage(): Promise<SuperAdmin> {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    forbidden();
  }
  return superAdmin;
}
