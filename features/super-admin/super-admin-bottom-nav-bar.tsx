"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SUPER_ADMIN_NAV_ITEMS } from "./super-admin-sidebar";

/** Mobile-only quick-access bar mirroring the tenant BottomNavBar. Super Admin's entire nav is small enough that all items fit directly — no "More" overflow needed. Column count tracks SUPER_ADMIN_NAV_ITEMS.length via inline style (a dynamic `grid-cols-N` Tailwind class wouldn't survive the production CSS purge). */
export function SuperAdminBottomNavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 grid w-full border-t border-black/[0.08] bg-background pb-[env(safe-area-inset-bottom)] md:hidden dark:border-white/[0.08]"
      style={{ gridTemplateColumns: `repeat(${SUPER_ADMIN_NAV_ITEMS.length}, minmax(0, 1fr))` }}
    >
      {SUPER_ADMIN_NAV_ITEMS.map((item) => {
        const isActive = item.href === "/super-admin" ? pathname === item.href : pathname?.startsWith(item.href);
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
