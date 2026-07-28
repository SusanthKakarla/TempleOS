import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AmbientBackground } from "./ambient-background";

interface DashboardFrameProps {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  bottomNav: React.ReactNode;
  footerLabel: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for both the tenant dashboard and the Super Admin console —
 * previously duplicated byte-for-byte across DashboardShell/SuperAdminShell.
 * The gap between the topbar and the content panel is 24px (gap-6): both are
 * `rounded-3xl` (~26px radius), and the previous 12px gap (gap-3) was smaller
 * than the corner radius, which reads as the two cards' corners colliding
 * rather than sitting apart.
 */
export function DashboardFrame({ sidebar, topbar, bottomNav, footerLabel, children }: DashboardFrameProps) {
  return (
    <SidebarProvider>
      <AmbientBackground />
      {sidebar}
      <SidebarInset className="h-svh overflow-hidden">
        <div className="flex h-full flex-col">
          {topbar}
          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="p-4 pb-20 sm:p-6 md:pb-6">
              <div className="mx-auto w-full max-w-400">{children}</div>
            </div>
            <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
              TempleOS &middot; {footerLabel}
            </footer>
          </div>
        </div>
      </SidebarInset>
      {bottomNav}
    </SidebarProvider>
  );
}
