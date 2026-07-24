"use client";

import { useState, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { TenantMembershipListItem } from "@/lib/db/tenant-memberships";
import type { AuditLogEntry, SupportedLanguage } from "@/types/db";
import { formatDateTime } from "@/lib/date";

export function UserActivityPanel({
  member,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  member: TenantMembershipListItem;
  trigger: ReactElement;
  /** Controlled open state — lets a caller open this from an OverflowActionMenu item instead of the given `trigger`. Omit for the default self-managed behavior. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("userManagement.activityPanel");
  const tActions = useTranslations("userManagement.activityLog.actionLabels");
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(next: boolean) {
    if (isControlled) {
      controlledOnOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
    if (!next || entries !== null || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${member.id}/activity`);
      const body = (await response.json().catch(() => ({}))) as { entries?: AuditLogEntry[] };
      setEntries(body.entries ?? []);
    } finally {
      setLoading(false);
    }
  }

  function actionLabel(action: string): string {
    return tActions.has(action) ? tActions(action) : action;
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={trigger} />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          {loading && <p className="text-sm text-muted-foreground">…</p>}
          {!loading && entries && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
          {entries?.map((entry) => (
            <div key={entry.id} className="glass-card rounded-xl p-3">
              <p className="text-sm font-medium">{actionLabel(entry.action)}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt, locale)}</p>
              {typeof entry.metadata?.newRoles !== "undefined" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {JSON.stringify(entry.metadata.previousRoles)} → {JSON.stringify(entry.metadata.newRoles)}
                </p>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
