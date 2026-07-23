"use client";

import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { TenantMembershipListItem } from "@/lib/db/tenant-memberships";
import { ROLE_CODES, type RoleCode } from "@/types/db";

export function ChangeRoleDialog({
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
  const tDialog = useTranslations("userManagement.changeRoleDialog");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [roles, setRoles] = useState<RoleCode[]>(member.roles);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleRole(role: RoleCode, checked: boolean) {
    setRoles((prev) => (checked ? [...prev, role] : prev.filter((r) => r !== role)));
  }

  async function handleSubmit() {
    setError(null);
    if (!window.confirm(tDialog("confirm", { name: member.displayName }))) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${member.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? tDialog("errorFallback"));
      }
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : tDialog("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setRoles(member.roles);
          setError(null);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tDialog("title")}</DialogTitle>
          <DialogDescription>{tDialog("description", { name: member.displayName })}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {ROLE_CODES.map((role) => {
            const checked = roles.includes(role);
            return (
              <label key={role} className="inline-flex h-8 items-center gap-2 rounded-md border px-2 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => toggleRole(role, value === true)}
                  aria-label={`${t(`roleNames.${role}`)} role for ${member.displayName}`}
                />
                <span>{t(`roleNames.${role}`)}</span>
              </label>
            );
          })}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? tCommon("saving") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
