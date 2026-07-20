"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { IndianRupee, User } from "lucide-react";
import type { Devotee, Donation, PaymentMethod } from "@/types/db";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dateTimeLocalValueToIso, isoToDateTimeLocalValue } from "@/features/events/datetime-local";
import { DateTimeField } from "@/features/events/date-time-field";
import {
  DONATION_PURPOSE_OTHER,
  DONATION_PURPOSE_PRESET_KEYS,
  DONATION_PURPOSE_PRESETS,
  PAYMENT_METHOD_OPTIONS,
} from "./donation-options";

interface DonationFormDialogProps {
  mode: "create" | "edit";
  donation?: Donation;
  devotees: Devotee[];
  /** Pre-selects a devotee and locks the picker — used from a devotee's own detail page. */
  fixedDevoteeId?: string;
  trigger: ReactElement;
  onSaved: () => void;
}

function initialPurposeState(purpose: string | undefined): { preset: string; custom: string } {
  if (!purpose) return { preset: DONATION_PURPOSE_PRESETS[0], custom: "" };
  if ((DONATION_PURPOSE_PRESETS as readonly string[]).includes(purpose)) {
    return { preset: purpose, custom: "" };
  }
  return { preset: DONATION_PURPOSE_OTHER, custom: purpose };
}

export function DonationFormDialog({
  mode,
  donation,
  devotees,
  fixedDevoteeId,
  trigger,
  onSaved,
}: DonationFormDialogProps) {
  const t = useTranslations("donations");
  const tForm = useTranslations("donations.formDialog");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [devoteeId, setDevoteeId] = useState(donation?.devoteeId ?? fixedDevoteeId ?? "");
  const [amount, setAmount] = useState(donation?.amount ?? "");
  const initialPurpose = initialPurposeState(donation?.purpose);
  const [purposePreset, setPurposePreset] = useState(initialPurpose.preset);
  const [customPurpose, setCustomPurpose] = useState(initialPurpose.custom);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(donation?.paymentMethod ?? "cash");
  const [notes, setNotes] = useState(donation?.notes ?? "");
  const [donatedAt, setDonatedAt] = useState(
    isoToDateTimeLocalValue(donation?.donatedAt ?? new Date().toISOString()),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetToDonation() {
    setDevoteeId(donation?.devoteeId ?? fixedDevoteeId ?? "");
    setAmount(donation?.amount ?? "");
    const purpose = initialPurposeState(donation?.purpose);
    setPurposePreset(purpose.preset);
    setCustomPurpose(purpose.custom);
    setPaymentMethod(donation?.paymentMethod ?? "cash");
    setNotes(donation?.notes ?? "");
    setDonatedAt(isoToDateTimeLocalValue(donation?.donatedAt ?? new Date().toISOString()));
    setError(null);
  }

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (!devoteeId) {
      setError(tForm("errors.selectDevotee"));
      return;
    }
    const amountNumber = Number(amount);
    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError(tForm("errors.invalidAmount"));
      return;
    }
    const purpose = purposePreset === DONATION_PURPOSE_OTHER ? customPurpose.trim() : purposePreset;
    if (!purpose) {
      setError(tForm("errors.enterPurpose"));
      return;
    }
    const donatedAtIso = dateTimeLocalValueToIso(donatedAt);
    if (!donatedAtIso) {
      setError(tForm("errors.dateRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/donations" : `/api/donations/${donation!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devoteeId,
          amount: amountNumber,
          purpose,
          paymentMethod,
          notes: notes || null,
          donatedAt: donatedAtIso,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? tForm("errorFallback"));
      }

      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : tForm("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  function purposeLabel(preset: string): string {
    const key = DONATION_PURPOSE_PRESET_KEYS[preset as keyof typeof DONATION_PURPOSE_PRESET_KEYS];
    return key ? t(`purposePresets.${key}`) : preset;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetToDonation();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? tForm("createTitle") : tForm("editTitle")}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? tForm("createDescription") : tForm("editDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="devoteeId">{tForm("fields.devotee")}</Label>
            <Select
              value={devoteeId}
              onValueChange={(value) => setDevoteeId(value ?? "")}
              disabled={Boolean(fixedDevoteeId)}
              items={Object.fromEntries(
                devotees.map((devotee) => [devotee.id, `${devotee.displayName} · ${devotee.whatsappPhone}`]),
              )}
            >
              <SelectTrigger id="devoteeId" className="w-full">
                <User className="size-4 text-muted-foreground" />
                <SelectValue placeholder={tForm("fields.devoteePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {devotees.map((devotee) => (
                  <SelectItem key={devotee.id} value={devotee.id}>
                    {devotee.displayName} · {devotee.whatsappPhone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FloatingLabelInput
              id="amount"
              label={tForm("fields.amount")}
              icon={<IndianRupee />}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">{tForm("fields.paymentMethod")}</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                items={Object.fromEntries(PAYMENT_METHOD_OPTIONS.map((o) => [o.value, t(`paymentMethods.${o.value}`)]))}
              >
                <SelectTrigger id="paymentMethod" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`paymentMethods.${option.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">{tForm("fields.purpose")}</Label>
            <Select
              value={purposePreset}
              onValueChange={(value) => setPurposePreset(value ?? "")}
              items={Object.fromEntries([
                ...DONATION_PURPOSE_PRESETS.map((preset) => [preset, purposeLabel(preset)]),
                [DONATION_PURPOSE_OTHER, t("purposePresets.other")],
              ])}
            >
              <SelectTrigger id="purpose" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DONATION_PURPOSE_PRESETS.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {purposeLabel(preset)}
                  </SelectItem>
                ))}
                <SelectItem value={DONATION_PURPOSE_OTHER}>{t("purposePresets.other")}</SelectItem>
              </SelectContent>
            </Select>
            {purposePreset === DONATION_PURPOSE_OTHER && (
              <Input
                placeholder={tForm("fields.purposePlaceholder")}
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                required
              />
            )}
          </div>

          <DateTimeField
            id="donatedAt"
            label={tForm("fields.donationDate")}
            value={donatedAt}
            onChange={setDonatedAt}
            required
          />

          <div className="space-y-2">
            <Label htmlFor="notes">{tForm("fields.notes")}</Label>
            <Textarea id="notes" value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={2} />
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
