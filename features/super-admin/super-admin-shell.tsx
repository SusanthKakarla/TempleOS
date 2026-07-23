import type { SuperAdmin } from "@/types/db";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AmbientBackground } from "@/features/dashboard/ambient-background";
import { MotionProvider } from "@/features/dashboard/motion-provider";
import { SuperAdminSidebar } from "./super-admin-sidebar";
import { SuperAdminTopbar } from "./super-admin-topbar";

export function SuperAdminShell({
  superAdmin,
  children,
}: {
  superAdmin: SuperAdmin;
  children: React.ReactNode;
}) {
  return (
    <MotionProvider>
      <SidebarProvider>
        <AmbientBackground />
        <SuperAdminSidebar />
        <SidebarInset className="h-svh overflow-hidden bg-muted/20 p-3">
          <div className="flex h-full flex-col gap-3">
            <SuperAdminTopbar displayName={superAdmin.displayName} phoneNumber={superAdmin.phoneNumber} />
            <div className="glass-panel flex-1 overflow-x-hidden overflow-y-auto rounded-3xl shadow-sm">
              <div className="p-4 sm:p-6">
                <div className="mx-auto w-full max-w-400">{children}</div>
              </div>
              <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
                TempleOS &middot; Platform
              </footer>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </MotionProvider>
  );
}
