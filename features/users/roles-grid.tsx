"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Flame, HeartHandshake, ShieldCheck, User, Users as UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoleCode, RoleDefinition } from "@/types/db";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { RoleDetailDialog } from "./role-detail-dialog";

const ROLE_ORDER: RoleCode[] = ["admin", "priest", "committee_member", "volunteer", "devotee"];

const ROLE_ICON: Record<RoleCode, typeof ShieldCheck> = {
  admin: ShieldCheck,
  priest: Flame,
  committee_member: UsersIcon,
  volunteer: HeartHandshake,
  devotee: User,
};

const ROLE_GRADIENT: Record<RoleCode, string> = {
  admin: "gradient-saffron-gold",
  priest: "gradient-maroon-orange",
  committee_member: "gradient-blue-purple",
  volunteer: "gradient-green-emerald",
  devotee: "bg-olive",
};

function sortRoles(roles: RoleDefinition[]): RoleDefinition[] {
  const order = new Map(ROLE_ORDER.map((code, index) => [code, index]));
  return [...roles].sort((a, b) => (order.get(a.code) ?? 99) - (order.get(b.code) ?? 99));
}

export function RolesGrid({
  roles,
  counts,
}: {
  roles: RoleDefinition[];
  counts: Partial<Record<RoleCode, number>>;
}) {
  const t = useTranslations("rolesAndPermissions");
  const tRoleNames = useTranslations("userManagement.roleNames");

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer()}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {sortRoles(roles).map((role) => {
        const Icon = ROLE_ICON[role.code];
        const permissionCount = Object.values(role.capabilitySet).filter((v) => v === true).length;
        const assignedCount = counts[role.code] ?? 0;

        return (
          <motion.div key={role.code} variants={rowFadeIn} whileHover={{ y: -3 }}>
            <RoleDetailDialog
              role={role}
              assignedCount={assignedCount}
              trigger={
                <Card className="glass-card group h-full cursor-pointer overflow-hidden rounded-3xl p-5 shadow-sm transition-shadow duration-300 hover:shadow-xl">
                  <CardHeader className="flex-row items-start justify-between gap-2 p-0">
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ring-2 ring-background transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${ROLE_GRADIENT[role.code]}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <Badge variant="secondary">{t("readOnlyBadge")}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 p-0 pt-3">
                    <CardTitle className="text-base">{tRoleNames(role.code)}</CardTitle>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{role.description ?? "—"}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <span>{t("permissionCount", { count: permissionCount })}</span>
                      <span>·</span>
                      <span>{t("assignedUsers", { count: assignedCount })}</span>
                    </div>
                  </CardContent>
                </Card>
              }
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
