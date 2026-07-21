import type { SessionPayload } from "@/lib/auth/session";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AmbientBackground } from "./ambient-background";
import { DashboardTopbar } from "./dashboard-topbar";
import { MotionProvider } from "./motion-provider";

export function DashboardShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  return (
    <MotionProvider>
      <SidebarProvider>
        <AmbientBackground />
        <AppSidebar isSuperAdmin={false} />
        <SidebarInset className="h-svh overflow-hidden bg-muted/20 p-3">
          <div className="flex h-full flex-col gap-3">
            <DashboardTopbar displayName={session.displayName} phoneNumber={session.phoneNumber} />
            <div className="glass-panel flex-1 overflow-y-auto rounded-3xl shadow-sm">
              <div className="p-4 sm:p-6">
                <div className="mx-auto w-full max-w-400">{children}</div>
              </div>
              <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
                TempleOS &middot; Pilot
              </footer>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </MotionProvider>
  );
}
