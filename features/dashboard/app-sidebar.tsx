"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Landmark,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
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

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, gradient: "gradient-saffron-gold" },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays, gradient: "gradient-maroon-orange" },
  { href: "/dashboard/devotees", label: "Devotees", icon: Users, gradient: "gradient-blue-purple" },
  {
    href: "/dashboard/whatsapp-activity",
    label: "WhatsApp Activity",
    icon: MessageCircle,
    gradient: "gradient-green-emerald",
  },
];

const SUPER_ADMIN_NAV_ITEM = {
  href: "/dashboard/admins",
  label: "Admins",
  icon: ShieldCheck,
  gradient: "bg-royal-blue",
};

export function AppSidebar({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const navItems = isSuperAdmin ? [...NAV_ITEMS, SUPER_ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="gradient-saffron-gold flex size-8 shrink-0 items-center justify-center rounded-lg text-saffron-foreground shadow-sm">
            <Landmark className="size-4.5" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            TempleOS
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard" ? pathname === item.href : pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                      className="h-10 gap-3"
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-transform",
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
        <p className="text-xs text-muted-foreground">TempleOS &middot; Pilot</p>
      </SidebarFooter>
    </Sidebar>
  );
}
