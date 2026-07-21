"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Cake, Heart, Phone, Sparkles, User, UserRound, Users, UsersRound } from "lucide-react";
import type { Devotee, Gender, MaritalStatus } from "@/types/db";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS } from "@/types/db";
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
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface DevoteeFormDialogProps {
  mode: "create" | "edit";
  devotee?: Devotee;
  trigger: ReactElement;
  onSaved: () => void;
}

export function DevoteeFormDialog({ mode, devotee, trigger, onSaved }: DevoteeFormDialogProps) {
  const t = useTranslations("devotees.formDialog");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [registrationType, setRegistrationType] = useState<"individual" | "family" | null>(
    mode === "edit" ? "individual" : null,
  );
  const [whatsappPhone, setWhatsappPhone] = useState(devotee?.whatsappPhone ?? "");
  const [displayName, setDisplayName] = useState(devotee?.displayName ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(devotee?.dateOfBirth ?? "");
  const [birthStar, setBirthStar] = useState(devotee?.birthStar ?? "");
  const [ancestralLineage, setAncestralLineage] = useState(devotee?.ancestralLineage ?? "");
  const [gender, setGender] = useState<Gender | "">(devotee?.gender ?? "");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "">(devotee?.maritalStatus ?? "");
  const [weddingAnniversary, setWeddingAnniversary] = useState(devotee?.weddingAnniversary ?? "");
  const [eventNotificationsEnabled, setEventNotificationsEnabled] = useState(
    devotee?.eventNotificationsEnabled ?? true,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetToDevotee() {
    setRegistrationType(mode === "edit" ? "individual" : null);
    setWhatsappPhone(devotee?.whatsappPhone ?? "");
    setDisplayName(devotee?.displayName ?? "");
    setDateOfBirth(devotee?.dateOfBirth ?? "");
    setBirthStar(devotee?.birthStar ?? "");
    setAncestralLineage(devotee?.ancestralLineage ?? "");
    setGender(devotee?.gender ?? "");
    setMaritalStatus(devotee?.maritalStatus ?? "");
    setWeddingAnniversary(devotee?.weddingAnniversary ?? "");
    setEventNotificationsEnabled(devotee?.eventNotificationsEnabled ?? true);
    setError(null);
  }

  const genderItems: Record<string, string> = Object.fromEntries(
    GENDER_OPTIONS.map((value) => [value, t(`genderOptions.${value}`)]),
  );
  const maritalStatusItems: Record<string, string> = Object.fromEntries(
    MARITAL_STATUS_OPTIONS.map((value) => [value, t(`maritalStatusOptions.${value}`)]),
  );

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/devotees" : `/api/devotees/${devotee!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappPhone,
          displayName,
          dateOfBirth,
          birthStar,
          ancestralLineage,
          gender: gender || null,
          maritalStatus: maritalStatus || null,
          weddingAnniversary,
          ...(mode === "edit" ? { eventNotificationsEnabled } : {}),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("errorFallback"));
      }

      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetToDevotee();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{registrationType === null ? t("registrationType.title") : mode === "create" ? t("createTitle") : t("editTitle")}</DialogTitle>
          <DialogDescription>
            {registrationType === null
              ? t("registrationType.description")
              : mode === "create"
                ? t("createDescription")
                : t("editDescription")}
          </DialogDescription>
        </DialogHeader>

        {registrationType === null ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRegistrationType("individual")}
              className="flex flex-col items-center gap-2 rounded-2xl border p-6 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              <UserRound className="size-8 text-primary" />
              <span className="font-medium">{t("registrationType.individual")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/devotees/family/new");
              }}
              className="flex flex-col items-center gap-2 rounded-2xl border p-6 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              <UsersRound className="size-8 text-primary" />
              <span className="font-medium">{t("registrationType.family")}</span>
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FloatingLabelInput
            id="displayName"
            label={t("fields.name")}
            icon={<User />}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <FloatingLabelInput
            id="whatsappPhone"
            label={t("fields.phoneNumber")}
            icon={<Phone />}
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">{t("fields.dateOfBirth")}</Label>
              <div className="relative">
                <Cake className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <FloatingLabelInput
              id="birthStar"
              label={t("fields.birthStar")}
              icon={<Sparkles />}
              value={birthStar}
              onChange={(e) => setBirthStar(e.target.value)}
            />
          </div>
          <FloatingLabelInput
            id="ancestralLineage"
            label={t("fields.gothram")}
            icon={<Users />}
            value={ancestralLineage}
            onChange={(e) => setAncestralLineage(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gender">{t("fields.gender")}</Label>
              <Select value={gender || undefined} onValueChange={(v) => setGender((v as Gender) ?? "")} items={genderItems}>
                <SelectTrigger id="gender" className="w-full">
                  <UserRound className="size-4 text-muted-foreground" />
                  <SelectValue placeholder={t("fields.genderPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`genderOptions.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus">{t("fields.maritalStatus")}</Label>
              <Select
                value={maritalStatus || undefined}
                onValueChange={(v) => setMaritalStatus((v as MaritalStatus) ?? "")}
                items={maritalStatusItems}
              >
                <SelectTrigger id="maritalStatus" className="w-full">
                  <Heart className="size-4 text-muted-foreground" />
                  <SelectValue placeholder={t("fields.maritalStatusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`maritalStatusOptions.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weddingAnniversary">{t("fields.weddingAnniversary")}</Label>
            <div className="relative">
              <Heart className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="weddingAnniversary"
                type="date"
                value={weddingAnniversary}
                onChange={(e) => setWeddingAnniversary(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {mode === "edit" && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-saffron" />
                <div>
                  <p className="text-sm font-medium">{t("eventNotifications.label")}</p>
                  <p className="text-xs text-muted-foreground">{t("eventNotifications.description")}</p>
                </div>
              </div>
              <Switch checked={eventNotificationsEnabled} onCheckedChange={setEventNotificationsEnabled} />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
