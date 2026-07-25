"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SUPER_ADMIN_NAV_ITEMS } from "./super-admin-sidebar";

/** Mobile-only quick-access bar mirroring the tenant BottomNavBar. Super Admin's entire nav is only 4 items, so all of them fit directly — no "More" overflow needed. */
export function SuperAdminBottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="glass-panel fixed inset-x-3 bottom-3 z-20 flex items-center justify-around rounded-2xl px-1 py-1.5 shadow-lg md:hidden">
      {SUPER_ADMIN_NAV_ITEMS.map((item) => {
        const isActive = item.href === "/super-admin" ? pathname === item.href : pathname?.startsWith(item.href);
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
