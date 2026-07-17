import Link from "next/link";
import type { SessionPayload } from "@/lib/auth/session";
import { LogoutButton } from "./logout-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/devotees", label: "Devotees" },
  { href: "/dashboard/whatsapp-activity", label: "WhatsApp Activity" },
];

export function DashboardShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="font-heading text-base font-semibold">TempleOS</span>
          <nav className="flex items-center gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{session.displayName}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 bg-muted/20 p-4 sm:p-6">{children}</main>
    </div>
  );
}
