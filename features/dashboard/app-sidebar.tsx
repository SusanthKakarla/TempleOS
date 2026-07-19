"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  BellRing,
  CalendarDays,
  LayoutDashboard,
  Landmark,
  MessageCircle,
  Receipt,
  Settings2,
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
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, gradient: "gradient-saffron-gold" },
  { href: "/dashboard/events", labelKey: "events", icon: CalendarDays, gradient: "gradient-maroon-orange" },
  { href: "/dashboard/devotees", labelKey: "devotees", icon: Users, gradient: "gradient-blue-purple" },
  {
    href: "/dashboard/donations",
    labelKey: "donations",
    icon: Receipt,
    gradient: "gradient-saffron-gold",
  },
  {
    href: "/dashboard/whatsapp-activity",
    labelKey: "conversations",
    icon: MessageCircle,
    gradient: "gradient-green-emerald",
  },
  {
    href: "/dashboard/notifications",
    labelKey: "notifications",
    icon: BellRing,
    gradient: "gradient-green-emerald",
  },
  {
    href: "/dashboard/chatbot-settings",
    labelKey: "chatbotSettings",
    icon: Settings2,
    gradient: "gradient-green-emerald",
  },
] as const;

const SUPER_ADMIN_NAV_ITEM = {
  href: "/dashboard/admins",
  labelKey: "admins",
  icon: ShieldCheck,
  gradient: "bg-royal-blue",
} as const;

export function AppSidebar({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
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
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="absolute inset-y-1 left-0 w-1 rounded-full bg-saffron"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={t(item.labelKey)}
                      render={<Link href={item.href} />}
                      className="group/nav-item h-10 gap-3"
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-transform duration-200 group-hover/nav-item:scale-110",
                          item.gradient,
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="font-medium">{t(item.labelKey)}</span>
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
