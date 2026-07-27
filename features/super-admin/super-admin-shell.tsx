import type { SuperAdmin } from "@/types/db";
import { DashboardFrame } from "@/features/dashboard/dashboard-frame";
import { MotionProvider } from "@/features/dashboard/motion-provider";
import { SuperAdminSidebar } from "./super-admin-sidebar";
import { SuperAdminTopbar } from "./super-admin-topbar";
import { SuperAdminBottomNavBar } from "./super-admin-bottom-nav-bar";

export function SuperAdminShell({
  superAdmin,
  children,
}: {
  superAdmin: SuperAdmin;
  children: React.ReactNode;
}) {
  return (
    <MotionProvider>
      <DashboardFrame
        sidebar={<SuperAdminSidebar />}
        topbar={<SuperAdminTopbar displayName={superAdmin.displayName} phoneNumber={superAdmin.phoneNumber} />}
        bottomNav={<SuperAdminBottomNavBar />}
        footerLabel="Platform"
      >
        {children}
      </DashboardFrame>
    </MotionProvider>
  );
}
