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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dateTimeLocalValueToIso, isoToDateTimeLocalValue } from "@/features/events/datetime-local";
import { DateTimeField } from "@/features/events/date-time-field";
import { formatInr } from "@/lib/currency";
import {
  DONATION_PURPOSE_OTHER,
  DONATION_PURPOSE_PRESET_KEYS,
  DONATION_PURPOSE_PRESETS,
  PAYMENT_METHOD_OPTIONS,
} from "./donation-options";
import { BLANK_MANUAL_DONOR, ManualDonorFields, type ManualDonorValue } from "./manual-donor-fields";

const AMOUNT_PRESETS = [101, 501, 1001, 5001] as const;

type DonorMode = "devotee" | "manual";

function initialManualDonor(donation: Donation | undefined): ManualDonorValue {
  if (!donation?.manualDonorName) return BLANK_MANUAL_DONOR;
  return {
    name: donation.manualDonorName,
    phone: donation.manualDonorPhone ?? "",
    email: donation.manualDonorEmail ?? "",
    address: donation.manualDonorAddress ?? "",
    isAnonymous: donation.isAnonymous,
  };
}

interface DonationFormDialogProps {
  mode: "create" | "edit";
  donation?: Donation;
  devotees: Devotee[];
  /** Pre-selects a devotee and locks the picker â€” used from a devotee's own detail page. */
  fixedDevoteeId?: string;
  /** Pre-selects a purpose and locks the picker â€” used when recording a donation against a specific campaign's linked purpose. */
  fixedPurpose?: string;
  trigger: ReactElement;
  onSaved: () => void;
  /** Controlled open state â€” lets a caller open this dialog from elsewhere (e.g. tapping a mobile row, or an overflow menu item) instead of `trigger`. Omit for the default self-managed behavior; `trigger` still renders (pass a visually-hidden element if unused). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  fixedPurpose,
  trigger,
  onSaved,
  open: controlledOpen,
  onOpenChange,
}: DonationFormDialogProps) {
  const t = useTranslations("donations");
  const tForm = useTranslations("donations.formDialog");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [donorMode, setDonorMode] = useState<DonorMode>(donation?.manualDonorName ? "manual" : "devotee");
  const [devoteeId, setDevoteeId] = useState(donation?.devoteeId ?? fixedDevoteeId ?? "");
  const [manualDonor, setManualDonor] = useState<ManualDonorValue>(() => initialManualDonor(donation));
  const [amount, setAmount] = useState(donation?.amount ?? "");
  const isCustomAmount = !(AMOUNT_PRESETS as readonly number[]).some((preset) => String(preset) === amount);
  const initialPurpose = initialPurposeState(donation?.purpose ?? fixedPurpose);
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
    setDonorMode(donation?.manualDonorName ? "manual" : "devotee");
    setDevoteeId(donation?.devoteeId ?? fixedDevoteeId ?? "");
    setManualDonor(initialManualDonor(donation));
    setAmount(donation?.amount ?? "");
    const purpose = initialPurposeState(donation?.purpose ?? fixedPurpose);
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

    if (donorMode === "devotee" && !devoteeId) {
      setError(tForm("errors.selectDevotee"));
      return;
    }
    if (donorMode === "manual" && !manualDonor.name.trim()) {
      setError(tForm("errors.enterDonorName"));
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
          devoteeId: donorMode === "devotee" ? devoteeId : null,
          manualDonor:
            donorMode === "manual"
              ? {
                  name: manualDonor.name.trim(),
                  phone: manualDonor.phone.trim() || null,
                  email: manualDonor.email.trim() || null,
                  address: manualDonor.address.trim() || null,
                  isAnonymous: manualDonor.isAnonymous,
                }
              : null,
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
      <DialogContent className="sm:max-w-175">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? tForm("createTitle") : tForm("editTitle")}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? tForm("createDescription") : tForm("editDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="justify-between">
              <span>{tForm("fields.donationFor")}</span>
            </Label>
            {!fixedDevoteeId && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={donorMode === "devotee" ? "default" : "outline"}
                  onClick={() => setDonorMode("devotee")}
                >
                  {tForm("fields.existingDevotee")}
                </Button>
                <Button
                  type="button"
                  variant={donorMode === "manual" ? "default" : "outline"}
                  onClick={() => setDonorMode("manual")}
                >
                  {tForm("fields.manualDonor")}
                </Button>
              </div>
            )}

            {donorMode === "devotee" ? (
              <div className="space-y-2">
                <Label htmlFor="devoteeId" className="justify-between">
                  <span>{tForm("fields.devotee")}</span>
                  <span className="text-xs font-normal text-muted-foreground">{tCommon("required")}</span>
                </Label>
                <Select
                  value={devoteeId}
                  onValueChange={(value) => setDevoteeId(value ?? "")}
                  disabled={Boolean(fixedDevoteeId)}
                  items={Object.fromEntries(
                    devotees.map((devotee) => [devotee.id, `${devotee.displayName} Â· ${devotee.whatsappPhone}`]),
                  )}
                >
                  <SelectTrigger id="devoteeId" size="lg" className="w-full">
                    <User className="size-4 text-muted-foreground" />
                    <SelectValue placeholder={tForm("fields.devoteePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {devotees.map((devotee) => (
                      <SelectItem key={devotee.id} value={devotee.id}>
                        {devotee.displayName} Â· {devotee.whatsappPhone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <ManualDonorFields value={manualDonor} onChange={setManualDonor} requiredLabel={tCommon("required")} />
            )}
          </div>

          <div className="space-y-2">
            <Label className="justify-between">
              <span>{tForm("fields.amount")}</span>
              <span className="text-xs font-normal text-muted-foreground">{tCommon("required")}</span>
            </Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {AMOUNT_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={amount === String(preset) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(String(preset))}
                >
                  {formatInr(preset)}
                </Button>
              ))}
              <Button
                type="button"
                variant={isCustomAmount ? "default" : "outline"}
                size="sm"
                onClick={() => setAmount("")}
              >
                {tForm("fields.customAmount")}
              </Button>
            </div>
            {isCustomAmount && (
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputSize="lg"
                  className="pl-9"
                  placeholder={tForm("fields.customAmountPlaceholder")}
                  required
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">{tForm("fields.paymentMethod")}</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              items={Object.fromEntries(PAYMENT_METHOD_OPTIONS.map((o) => [o.value, t(`paymentMethods.${o.value}`)]))}
            >
              <SelectTrigger id="paymentMethod" size="lg" className="w-full">
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

          <div className="space-y-2">
            <Label htmlFor="purpose" className="justify-between">
              <span>{tForm("fields.purpose")}</span>
              <span className="text-xs font-normal text-muted-foreground">{tCommon("required")}</span>
            </Label>
            <Select
              value={purposePreset}
              onValueChange={(value) => setPurposePreset(value ?? "")}
              disabled={Boolean(fixedPurpose)}
              items={Object.fromEntries([
                ...DONATION_PURPOSE_PRESETS.map((preset) => [preset, purposeLabel(preset)]),
                [DONATION_PURPOSE_OTHER, t("purposePresets.other")],
              ])}
            >
              <SelectTrigger id="purpose" size="lg" className="w-full">
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
              <>
                <Label htmlFor="purpose-other" className="sr-only">
                  {tForm("fields.purposePlaceholder")}
                </Label>
                <Input
                  id="purpose-other"
                  placeholder={tForm("fields.purposePlaceholder")}
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  inputSize="lg"
                  required
                />
              </>
            )}
          </div>

          <DateTimeField
            id="donatedAt"
            label={tForm("fields.donationDate")}
            value={donatedAt}
            onChange={setDonatedAt}
            required
            requiredLabel={tCommon("required")}
            size="lg"
          />

          <div className="space-y-2">
            <Label htmlFor="notes">{tForm("fields.notes")}</Label>
            <Textarea id="notes" value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" size="xl" disabled={submitting}>
              {submitting ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
