"use client";

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { IndianRupee, Package, Search, User } from "lucide-react";
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
import { ManualDonorFields, BLANK_MANUAL_DONOR, type ManualDonorValue } from "./manual-donor-fields";

const AMOUNT_PRESETS = [101, 501, 1001, 5001] as const;
const NON_CASH_SUGGESTIONS = ["Rice", "Milk", "Coconuts", "Flowers", "Oil"] as const;
const DEVOTEE_RESULT_LIMIT = 8;

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

interface DevoteeSearchFieldProps {
  devotees: Devotee[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder: string;
  noResultsLabel: string;
  noPhoneLabel: string;
}

function devoteeLabel(devotee: Devotee | undefined): string {
  if (!devotee) return "";
  return [devotee.displayName, devotee.whatsappPhone].filter(Boolean).join(" · ");
}

function DevoteeSearchField({
  devotees,
  value,
  onChange,
  disabled,
  placeholder,
  noResultsLabel,
  noPhoneLabel,
}: DevoteeSearchFieldProps) {
  const [search, setSearch] = useState("");
  const selectedDevotee = devotees.find((devotee) => devotee.id === value);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredDevotees = useMemo(() => {
    const matches = normalizedSearch
      ? devotees.filter((devotee) =>
          [devotee.displayName, devotee.whatsappPhone, devotee.familyName]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : devotees;
    return matches.slice(0, DEVOTEE_RESULT_LIMIT);
  }, [devotees, normalizedSearch]);

  if (disabled) {
    return (
      <Input
        id="devotee-search"
        value={devoteeLabel(selectedDevotee)}
        disabled
        inputSize="lg"
        className="bg-muted/50"
        aria-label={placeholder}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative z-20">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="devotee-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          inputSize="lg"
          className="pl-9"
          placeholder={selectedDevotee ? devoteeLabel(selectedDevotee) : placeholder}
        />
        {normalizedSearch && (
          <div className="absolute top-full left-0 z-30 mt-1 max-h-48 w-full origin-top overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-150 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1">
            {filteredDevotees.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">{noResultsLabel}</p>
            ) : (
              filteredDevotees.map((devotee) => (
                <button
                  key={devotee.id}
                  type="button"
                  onClick={() => {
                    onChange(devotee.id);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted ${
                    devotee.id === value ? "bg-primary/5 text-primary" : ""
                  }`}
                >
                  <User className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{devotee.displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{devotee.whatsappPhone ?? noPhoneLabel}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
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
  const [devoteeId, setDevoteeId] = useState(donation?.devoteeId ?? fixedDevoteeId ?? "");
  const [donorMode, setDonorMode] = useState<"devotee" | "manual">(
    donation && !donation.devoteeId ? "manual" : "devotee",
  );
  const [manualDonor, setManualDonor] = useState<ManualDonorValue>(
    donation && !donation.devoteeId
      ? {
          name: donation.manualDonorName ?? "",
          phone: donation.manualDonorPhone ?? "",
          email: donation.manualDonorEmail ?? "",
          address: donation.manualDonorAddress ?? "",
          isAnonymous: donation.isAnonymous,
        }
      : BLANK_MANUAL_DONOR,
  );
  const [amount, setAmount] = useState(donation?.amount ?? "");
  const [isNonCash, setIsNonCash] = useState(Boolean(donation?.itemDescription));
  const [itemDescription, setItemDescription] = useState(donation?.itemDescription ?? "");
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
    setDevoteeId(donation?.devoteeId ?? fixedDevoteeId ?? "");
    setDonorMode(donation && !donation.devoteeId ? "manual" : "devotee");
    setManualDonor(
      donation && !donation.devoteeId
        ? {
            name: donation.manualDonorName ?? "",
            phone: donation.manualDonorPhone ?? "",
            email: donation.manualDonorEmail ?? "",
            address: donation.manualDonorAddress ?? "",
            isAnonymous: donation.isAnonymous,
          }
        : BLANK_MANUAL_DONOR,
    );
    setAmount(donation?.amount ?? "");
    setIsNonCash(Boolean(donation?.itemDescription));
    setItemDescription(donation?.itemDescription ?? "");
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

    if (donorMode === "devotee") {
      if (!devoteeId) {
        setError(tForm("errors.selectDevotee"));
        return;
      }
    } else if (!manualDonor.name.trim()) {
      setError(tForm("errors.enterDonorName"));
      return;
    }
    let amountNumber: number | null = null;
    if (isNonCash) {
      if (!itemDescription.trim()) {
        setError(tForm("errors.enterItemDescription"));
        return;
      }
    } else {
      amountNumber = Number(amount);
      if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
        setError(tForm("errors.invalidAmount"));
        return;
      }
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

    const manualDonorPayload = {
      name: manualDonor.name.trim(),
      phone: manualDonor.phone.trim() || null,
      email: manualDonor.email.trim() || null,
      address: manualDonor.address.trim() || null,
      isAnonymous: manualDonor.isAnonymous,
    };
    // Create's schema wants devoteeId/manualDonor nullable so the XOR check can
    // compare truthiness; update's schema treats "key present at all" as "change
    // this field" (and devoteeId there isn't nullable), so an edit must omit
    // whichever side isn't active rather than sending it as null.
    const donorFields =
      mode === "create"
        ? { devoteeId: donorMode === "devotee" ? devoteeId : null, manualDonor: donorMode === "manual" ? manualDonorPayload : null }
        : donorMode === "devotee"
          ? { devoteeId }
          : { manualDonor: manualDonorPayload };

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/donations" : `/api/donations/${donation!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...donorFields,
          amount: isNonCash ? null : amountNumber,
          purpose,
          paymentMethod: isNonCash ? null : paymentMethod,
          itemDescription: isNonCash ? itemDescription.trim() : null,
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
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-175">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? tForm("createTitle") : tForm("editTitle")}</DialogTitle>
          {mode === "edit" && <DialogDescription>{tForm("editDescription")}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 pl-3 [direction:rtl]">
            <div className="space-y-4 [direction:ltr]">
              <div className="space-y-2">
                <Label htmlFor="devotee-search" className="justify-between">
                  <span>{donorMode === "devotee" ? tForm("fields.devotee") : tForm("fields.manualDonor")}</span>
                  <span className="text-xs font-normal text-muted-foreground">{tCommon("required")}</span>
                </Label>
                {!fixedDevoteeId && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={donorMode === "devotee" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDonorMode("devotee")}
                    >
                      {tForm("fields.existingDevotee")}
                    </Button>
                    <Button
                      type="button"
                      variant={donorMode === "manual" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDonorMode("manual")}
                    >
                      {tForm("fields.manualDonor")}
                    </Button>
                  </div>
                )}
                {donorMode === "devotee" ? (
                  <DevoteeSearchField
                    devotees={devotees}
                    value={devoteeId}
                    onChange={setDevoteeId}
                    disabled={Boolean(fixedDevoteeId)}
                    placeholder={tForm("fields.devoteeSearchPlaceholder")}
                    noResultsLabel={tForm("fields.noDevoteesFound")}
                    noPhoneLabel={tForm("fields.noPhone")}
                  />
                ) : (
                  <ManualDonorFields value={manualDonor} onChange={setManualDonor} requiredLabel={tCommon("required")} />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="donation-value" className="justify-between">
                  <span>{isNonCash ? tForm("fields.itemDescription") : tForm("fields.amount")}</span>
                  <span className="text-xs font-normal text-muted-foreground">{tCommon("required")}</span>
                </Label>
                <div className="relative">
                  {isNonCash ? (
                    <Package className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  ) : (
                    <IndianRupee className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  )}
                  {isNonCash ? (
                    <Input
                      id="donation-value"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      inputSize="lg"
                      className="pl-9"
                      placeholder={tForm("fields.itemDescriptionPlaceholder")}
                      autoFocus
                    />
                  ) : (
                    <Input
                      id="donation-value"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputSize="lg"
                      className="pl-9"
                      placeholder={tForm("fields.amountPlaceholder")}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isNonCash ? (
                    <>
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
                        variant="outline"
                        size="sm"
                        className="border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950/60"
                        onClick={() => { setIsNonCash(true); setAmount(""); }}
                      >
                        {tForm("fields.nonCashDonation")}
                      </Button>
                    </>
                  ) : (
                    <>
                      {NON_CASH_SUGGESTIONS.map((item) => (
                        <Button
                          key={item}
                          type="button"
                          variant={itemDescription === item ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => setItemDescription(item)}
                        >
                          {item}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
                        onClick={() => { setIsNonCash(false); setItemDescription(""); }}
                      >
                        {tForm("fields.switchToCash")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {!isNonCash && (
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
              )}

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
                allowPastDates
              />

              <div className="space-y-2">
                <Label htmlFor="notes">{tForm("fields.notes")}</Label>
                <Textarea id="notes" value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <DialogFooter className="mx-0 mt-4 mb-0 rounded-none border-t-0 p-0">
            <Button type="submit" size="xl" disabled={submitting}>
              {submitting ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
