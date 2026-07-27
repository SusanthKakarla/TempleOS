import type { SessionPayload } from "@/lib/auth/session";
import { listTenantFeatures } from "@/lib/db/tenant-features";
import { getTenantById } from "@/lib/db/tenants";
import { AppSidebar } from "./app-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { BottomNavBar } from "./bottom-nav-bar";
import { DashboardFrame } from "./dashboard-frame";
import { MotionProvider } from "./motion-provider";

export async function DashboardShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  const [features, tenant] = await Promise.all([
    listTenantFeatures(session.tenantId),
    getTenantById(session.tenantId),
  ]);
  const enabledFeatures = new Set(features.filter((f) => f.enabled).map((f) => f.key));

  return (
    <MotionProvider>
      <DashboardFrame
        sidebar={
          <AppSidebar isSuperAdmin={false} enabledFeatures={enabledFeatures} tenantName={tenant?.name ?? "TempleOS"} />
        }
        topbar={<DashboardTopbar displayName={session.displayName} phoneNumber={session.phoneNumber} />}
        bottomNav={<BottomNavBar />}
        footerLabel="Pilot"
      >
        {children}
      </DashboardFrame>
    </MotionProvider>
  );
}
