"use client";

import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RoleDefinition } from "@/types/db";

export function RoleDetailDialog({
  role,
  assignedCount,
  trigger,
}: {
  role: RoleDefinition;
  assignedCount: number;
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("rolesAndPermissions");
  const tRoleNames = useTranslations("userManagement.roleNames");

  const capabilities = Object.entries(role.capabilitySet).filter(([, enabled]) => enabled === true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tRoleNames(role.code)}
            <Badge variant="secondary">{t("readOnlyBadge")}</Badge>
          </DialogTitle>
          <DialogDescription>{role.description ?? "—"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("roleDetailDialog.capabilitiesTitle")}</p>
            <div className="flex flex-wrap gap-1.5">
              {capabilities.length === 0 ? (
                <span className="text-sm text-muted-foreground">{t("noPermissions")}</span>
              ) : (
                capabilities.map(([key]) => (
                  <Badge key={key} variant="outline">
                    {t(`capabilities.${key}`)}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("roleDetailDialog.usersTitle")}</p>
            <p className="text-sm">{t("assignedUsers", { count: assignedCount })}</p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">{t("roleDetailDialog.restrictionsTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("roleDetailDialog.restrictionsText")}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
