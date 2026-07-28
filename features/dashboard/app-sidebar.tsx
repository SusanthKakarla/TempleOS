"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Landmark,
  LayoutDashboard,
  Megaphone,
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
import { springSnappy } from "@/lib/motion";

export const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, featureKey: "dashboard" },
  { href: "/dashboard/events", labelKey: "events", icon: CalendarDays, featureKey: "events" },
  { href: "/dashboard/devotees", labelKey: "devotees", icon: Users, featureKey: "devotees" },
  { href: "/dashboard/donations", labelKey: "donations", icon: Receipt, featureKey: "donations" },
  { href: "/dashboard/campaigns", labelKey: "campaigns", icon: Megaphone, featureKey: "campaigns" },
  { href: "/dashboard/chatbot-settings", labelKey: "chatbotSettings", icon: Settings2, featureKey: "whatsapp_chatbot" },
] as const;

const SUPER_ADMIN_NAV_ITEM = {
  href: "/dashboard/admins",
  labelKey: "admins",
  icon: ShieldCheck,
} as const;

export function AppSidebar({
  isSuperAdmin,
  enabledFeatures,
  tenantName,
}: {
  isSuperAdmin: boolean;
  /** Feature keys enabled for this tenant — undefined means "don't filter" (e.g. super-admin views without a tenant). */
  enabledFeatures?: Set<string>;
  /** The logged-in temple's name, shown in place of the static "TempleOS" brand mark. */
  tenantName: string;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const navItems = (isSuperAdmin ? [...NAV_ITEMS, SUPER_ADMIN_NAV_ITEM] : NAV_ITEMS).filter(
    (item) => !("featureKey" in item) || !enabledFeatures || enabledFeatures.has(item.featureKey),
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="bg-accent flex size-8 shrink-0 items-center justify-center rounded-lg text-accent-foreground shadow-sm">
            <Landmark className="size-4.5" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            {tenantName}
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
                        className="absolute inset-y-1 left-0 w-1 rounded-full bg-accent"
                        transition={springSnappy}
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
                          "flex size-6 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover/nav-item:scale-110",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "bg-sidebar-foreground/10 text-sidebar-foreground",
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
