"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  BellRing,
  CalendarDays,
  ChevronRight,
  Landmark,
  LayoutDashboard,
  MessageCircle,
  Receipt,
  Settings2,
  ShieldCheck,
  UserCog,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";

export const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, featureKey: "dashboard" },
  { href: "/dashboard/events", labelKey: "events", icon: CalendarDays, featureKey: "events" },
  { href: "/dashboard/devotees", labelKey: "devotees", icon: Users, featureKey: "devotees" },
  { href: "/dashboard/donations", labelKey: "donations", icon: Receipt, featureKey: "donations" },
  { href: "/dashboard/whatsapp-activity", labelKey: "conversations", icon: MessageCircle, featureKey: "conversations" },
  { href: "/dashboard/notifications", labelKey: "notifications", icon: BellRing, featureKey: "notifications" },
  { href: "/dashboard/chatbot-settings", labelKey: "chatbotSettings", icon: Settings2, featureKey: "whatsapp_chatbot" },
] as const;

const SUPER_ADMIN_NAV_ITEM = {
  href: "/dashboard/admins",
  labelKey: "admins",
  icon: ShieldCheck,
} as const;

const USER_MANAGEMENT_NAV_ITEM = {
  icon: UserCog,
  children: [
    { href: "/dashboard/users", labelKey: "users" as const, featureKey: "user_management" as const },
    { href: "/dashboard/roles", labelKey: "rolesAndPermissions" as const, featureKey: "roles_permissions" as const },
  ],
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

  const userManagementChildren = USER_MANAGEMENT_NAV_ITEM.children.filter(
    (child) => !enabledFeatures || enabledFeatures.has(child.featureKey),
  );
  const userManagementActive = userManagementChildren.some((child) => pathname?.startsWith(child.href));

  return (
    <Sidebar collapsible="icon" variant="floating">
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
              {userManagementChildren.length > 0 && (
                <Collapsible defaultOpen={userManagementActive}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          isActive={userManagementActive}
                          tooltip={t("userManagement")}
                          className="group/nav-item h-10 gap-3"
                        >
                          <span
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover/nav-item:scale-110",
                              userManagementActive
                                ? "bg-accent text-accent-foreground"
                                : "bg-sidebar-foreground/10 text-sidebar-foreground",
                            )}
                          >
                            <UserCog className="size-3.5" />
                          </span>
                          <span className="font-medium">{t("userManagement")}</span>
                          <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[panel-open]/nav-item:rotate-90" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {userManagementChildren.map((child) => {
                          const isActive = pathname?.startsWith(child.href);
                          return (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton isActive={isActive} render={<Link href={child.href} />}>
                                <span>{t(child.labelKey)}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
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
