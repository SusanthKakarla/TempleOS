"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, LayoutDashboard, Menu, Receipt, Users } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/devotees", labelKey: "devotees", icon: Users },
  { href: "/dashboard/events", labelKey: "events", icon: CalendarDays },
  { href: "/dashboard/donations", labelKey: "donations", icon: Receipt },
] as const;

/** Mobile-only quick-access bar for the 4 most-used sections, plus a "More" trigger for the full drawer. The drawer (AppSidebar as a Sheet) remains the primary/complete nav — this is a shortcut, not a replacement. */
export function BottomNavBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { toggleSidebar } = useSidebar();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 grid w-full grid-cols-5 border-t border-black/[0.08] bg-background pb-[env(safe-area-inset-bottom)] md:hidden dark:border-white/[0.08]"
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = item.href === "/dashboard" ? pathname === item.href : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.65rem] font-medium transition-colors",
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
        className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.65rem] font-medium text-muted-foreground transition-colors"
      >
        <Menu className="size-5" />
        {t("more")}
      </button>
    </nav>
  );
}
