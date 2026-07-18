import { forbidden, redirect } from "next/navigation";
import { requireTenantAdminSession } from "@/lib/auth/tenant-admin";
import type { SessionPayload } from "@/lib/auth/session";

export async function requireDashboardAdmin(): Promise<SessionPayload> {
  const auth = await requireTenantAdminSession();
  if (!auth.ok && auth.status === 401) {
    redirect("/login");
  }
  if (!auth.ok) {
    forbidden();
  }
  return auth.session;
}
