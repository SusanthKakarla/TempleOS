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
        <SidebarInset>
          <DashboardTopbar displayName={session.displayName} phoneNumber={session.phoneNumber} />
          <main className="flex-1 bg-muted/20 p-4 sm:p-6">
            <div className="mx-auto w-full max-w-400">{children}</div>
          </main>
          <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
            TempleOS &middot; Pilot
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </MotionProvider>
  );
}
