import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import {
  requireSuperAdmin,
  SUPER_ADMIN_SESSION_COOKIE_NAME,
} from "@/lib/auth/super-admin-session";
import type { SuperAdmin } from "@/types/db";

export async function requireSuperAdminPage(
  returnPath = "/super-admin/temples/new",
): Promise<SuperAdmin> {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    const store = await cookies();
    if (store.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value) {
      forbidden();
    }
    redirect(`/super-admin/login?next=${encodeURIComponent(returnPath)}`);
  }
  return superAdmin;
}
