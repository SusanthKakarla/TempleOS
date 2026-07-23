"use client";

import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { TenantMembershipListItem } from "@/lib/db/tenant-memberships";

export function ToggleUserStatusDialog({
  member,
  trigger,
  onChanged,
  open: controlledOpen,
  onOpenChange,
}: {
  member: TenantMembershipListItem;
  trigger: ReactElement;
  onChanged: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("userManagement");
  const tDialog = useTranslations("userManagement.toggleStatusDialog");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isActive = member.status === "active";
  const nextStatus = isActive ? "inactive" : "active";

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${member.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? (isActive ? t("disableError") : t("enableError")));
      }
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("disableError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isActive ? tDialog("disableTitle") : tDialog("enableTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {isActive
              ? tDialog("disableDescription", { name: member.displayName })
              : tDialog("enableDescription", { name: member.displayName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant={isActive ? "destructive" : "success"}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {isActive ? tDialog("disableConfirm") : tDialog("enableConfirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
