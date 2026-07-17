import { redirect } from "next/navigation";
import { clearSessionCookie, getSessionAdmin } from "@/lib/auth/session";
import { getAdminById } from "@/lib/db/admin-users";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionAdmin();
  if (!session) {
    redirect("/login");
  }

  // Re-check the admin's live status/role on every load rather than trusting
  // the (up to 30-day) session cookie — a deactivation or role change must
  // take effect immediately, not whenever the cookie next expires.
  const admin = await getAdminById(session.adminId);
  if (!admin || !admin.active) {
    await clearSessionCookie();
    redirect("/login");
  }

  return (
    <DashboardShell session={session} role={admin.role}>
      {children}
    </DashboardShell>
  );
}
