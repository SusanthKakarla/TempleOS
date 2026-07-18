import { requireDashboardAdmin } from "./dashboard/require-dashboard-admin";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDashboardAdmin();
  return <DashboardShell session={session}>{children}</DashboardShell>;
}
