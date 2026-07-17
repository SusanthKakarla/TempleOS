import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth/session";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionAdmin();
  if (!session) {
    redirect("/login");
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}
