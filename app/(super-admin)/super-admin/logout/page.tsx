import { redirect } from "next/navigation";
import { clearSuperAdminSessionCookie } from "@/lib/auth/super-admin-session";

export default async function SuperAdminLogoutPage() {
  await clearSuperAdminSessionCookie();
  redirect("/super-admin/login");
}
