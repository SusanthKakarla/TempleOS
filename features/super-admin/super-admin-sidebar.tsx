"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Landmark, LayoutDashboard, ShieldCheck, UserCog } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";

export const SUPER_ADMIN_NAV_ITEMS = [
  { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard, gradient: "gradient-saffron-gold" },
  { href: "/super-admin/temples", label: "Temples", icon: Landmark, gradient: "gradient-maroon-orange" },
  { href: "/super-admin/roles", label: "Role Catalog", icon: ShieldCheck, gradient: "gradient-green-emerald" },
  { href: "/super-admin/admins", label: "Platform Admins", icon: UserCog, gradient: "gradient-blue-purple" },
] as const;

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="gradient-ocean-blue flex size-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground shadow-sm">
            <Landmark className="size-4.5" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <span className="block font-heading text-lg leading-tight font-semibold tracking-tight">TempleOS</span>
            <span className="block text-[0.65rem] leading-tight font-medium tracking-wide text-muted-foreground uppercase">
              Super Admin
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {SUPER_ADMIN_NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/super-admin" ? pathname === item.href : pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    {isActive && (
                      <motion.div
                        layoutId="super-admin-sidebar-active-indicator"
                        className="absolute inset-y-1 left-0 w-1 rounded-full bg-primary"
                        transition={springSnappy}
                      />
                    )}
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                      className="group/nav-item h-10 gap-3"
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-transform duration-200 group-hover/nav-item:scale-110 group-hover/nav-item:rotate-6",
                          item.gradient,
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 py-3 group-data-[collapsible=icon]:hidden">
        <p className="text-xs text-muted-foreground">TempleOS &middot; Platform</p>
      </SidebarFooter>
    </Sidebar>
  );
}
