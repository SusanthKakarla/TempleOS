import type { SessionPayload } from "@/lib/auth/session";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";

export function DashboardShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardTopbar displayName={session.displayName} phoneNumber={session.phoneNumber} />
        <main className="flex-1 bg-muted/20 p-4 sm:p-6">{children}</main>
        <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
          TempleOS &middot; Pilot
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
