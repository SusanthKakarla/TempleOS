import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth/session";
import { getAdminById } from "@/lib/db/admin-users";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionAdmin();
  if (!session) {
    redirect("/login");
  }

  // Re-check the admin's live status/role on every load rather than trusting
  // the (up to 30-day) session cookie — a deactivation or role change must
  // take effect immediately, not whenever the cookie next expires. We don't
  // clear the cookie here: Server Component rendering can only read cookies,
  // not mutate them (that requires a Route Handler or Server Action) — but
  // that's fine, since this same live check runs on every request and keeps
  // redirecting regardless of whether the stale cookie is deleted. It'll
  // clear naturally the next time they hit /api/auth/session (fresh login,
  // or explicit sign-out), or simply expire.
  const admin = await getAdminById(session.adminId);
  if (!admin || !admin.active) {
    redirect("/login");
  }

  return (
    <DashboardShell session={session} role={admin.role}>
      {children}
    </DashboardShell>
  );
}
