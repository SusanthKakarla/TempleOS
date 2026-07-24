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

export function DeleteUserDialog({
  member,
  trigger,
  onDeleted,
  open: controlledOpen,
  onOpenChange,
}: {
  member: TenantMembershipListItem;
  trigger: ReactElement;
  onDeleted: () => void;
  /** Controlled open state — lets a caller open this from an OverflowActionMenu item instead of the given `trigger`. Omit for the default self-managed behavior. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const tDialog = useTranslations("userManagement.deleteDialog");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${member.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? tDialog("errorFallback"));
      }
      setOpen(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : tDialog("errorFallback"));
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
          <AlertDialogTitle>{tDialog("title")}</AlertDialogTitle>
          <AlertDialogDescription>{tDialog("description", { name: member.displayName })}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            {tCommon("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {tDialog("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
