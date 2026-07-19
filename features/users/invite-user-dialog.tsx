"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Phone, User } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_CODES, type RoleCode } from "@/types/db";

export function InviteUserDialog({ trigger, onInvited }: { trigger: ReactElement; onInvited: () => void }) {
  const t = useTranslations("userManagement");
  const tDialog = useTranslations("userManagement.inviteDialog");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [roles, setRoles] = useState<RoleCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setDisplayName("");
    setPhoneNumber("");
    setRoles([]);
    setError(null);
  }

  function toggleRole(role: RoleCode, checked: boolean) {
    setRoles((prev) => (checked ? [...prev, role] : prev.filter((r) => r !== role)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (roles.length === 0) {
      setError(tDialog("rolesHelper"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, phoneNumber, roles }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? tDialog("errorFallback"));
      }
      setOpen(false);
      onInvited();
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
        if (next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tDialog("title")}</DialogTitle>
          <DialogDescription>{tDialog("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">{tDialog("fields.name")}</Label>
            <div className="relative">
              <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="invite-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-phone">{tDialog("fields.phone")}</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="invite-phone"
                placeholder={tDialog("fields.phonePlaceholder")}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tDialog("fields.roles")}</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_CODES.map((role) => {
                const checked = roles.includes(role);
                return (
                  <label
                    key={role}
                    className="inline-flex h-8 items-center gap-2 rounded-md border px-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={checked}
                      onChange={(e) => toggleRole(role, e.target.checked)}
                    />
                    <span>{t(`roleNames.${role}`)}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{tDialog("rolesHelper")}</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
