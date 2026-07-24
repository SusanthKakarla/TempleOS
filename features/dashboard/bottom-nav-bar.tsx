"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, CalendarDays, LayoutDashboard, Menu, Receipt } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/events", labelKey: "events", icon: CalendarDays },
  { href: "/dashboard/donations", labelKey: "donations", icon: Receipt },
  { href: "/dashboard/notification-preferences", labelKey: "notifications", icon: Bell },
] as const;

/** Mobile-only quick-access bar for the 4 most-used sections, plus a "More" trigger for the full drawer. The drawer (AppSidebar as a Sheet) remains the primary/complete nav — this is a shortcut, not a replacement. */
export function BottomNavBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="glass-panel fixed inset-x-3 bottom-3 z-20 flex items-center justify-around rounded-2xl px-1 py-1.5 shadow-lg md:hidden">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = item.href === "/dashboard" ? pathname === item.href : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[0.65rem] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {t(item.labelKey)}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[0.65rem] font-medium text-muted-foreground transition-colors"
      >
        <Menu className="size-5" />
        {t("more")}
      </button>
    </nav>
  );
}
