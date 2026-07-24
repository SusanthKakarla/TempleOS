"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Languages, User } from "lucide-react";
import type { SupportedLanguage } from "@/types/db";
import type { TenantMembershipListItem } from "@/lib/db/tenant-memberships";
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
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EditUserDialog({
  member,
  trigger,
  onSaved,
  open: controlledOpen,
  onOpenChange,
}: {
  member: TenantMembershipListItem;
  trigger: ReactElement;
  onSaved: () => void;
  /** Controlled open state — lets a caller open this from an OverflowActionMenu item instead of the given `trigger`. Omit for the default self-managed behavior. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("userManagement");
  const tDialog = useTranslations("userManagement.editDialog");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [displayName, setDisplayName] = useState(member.displayName);
  const [preferredUiLanguage, setPreferredUiLanguage] = useState<SupportedLanguage | "">(
    member.preferredUiLanguage ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setDisplayName(member.displayName);
    setPreferredUiLanguage(member.preferredUiLanguage ?? "");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          ...(preferredUiLanguage ? { preferredUiLanguage } : {}),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? tDialog("errorFallback"));
      }
      setOpen(false);
      onSaved();
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tDialog("title")}</DialogTitle>
          <DialogDescription>{tDialog("description", { name: member.displayName })}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <LabeledInput
            id="edit-user-name"
            label={tDialog("fields.name")}
            icon={<User />}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <div className="space-y-2">
            <Label htmlFor="edit-user-language">{tDialog("fields.language")}</Label>
            <Select
              value={preferredUiLanguage || undefined}
              onValueChange={(v) => setPreferredUiLanguage((v as SupportedLanguage) ?? "")}
              items={{ en: t("languageNames.en"), te: t("languageNames.te") }}
            >
              <SelectTrigger id="edit-user-language" className="w-full">
                <Languages className="size-4 text-muted-foreground" />
                <SelectValue placeholder={tDialog("fields.languagePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("languageNames.en")}</SelectItem>
                <SelectItem value="te">{t("languageNames.te")}</SelectItem>
              </SelectContent>
            </Select>
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
