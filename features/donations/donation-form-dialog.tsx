"use client";

import { useState, type FormEvent, type ReactElement } from "react";
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
import { DONATION_PURPOSE_OTHER, DONATION_PURPOSE_PRESETS, PAYMENT_METHOD_OPTIONS } from "./donation-options";

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
      setError("Select a devotee");
      return;
    }
    const amountNumber = Number(amount);
    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError("Enter a valid amount greater than zero");
      return;
    }
    const purpose = purposePreset === DONATION_PURPOSE_OTHER ? customPurpose.trim() : purposePreset;
    if (!purpose) {
      setError("Enter a purpose");
      return;
    }
    const donatedAtIso = dateTimeLocalValueToIso(donatedAt);
    if (!donatedAtIso) {
      setError("Donation date is required");
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
        throw new Error(body.error ?? "Failed to save donation");
      }

      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save donation");
    } finally {
      setSubmitting(false);
    }
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
          <DialogTitle>{mode === "create" ? "Add donation" : "Edit donation"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Record a donation received in cash, UPI, or another manual method."
              : "Update this donation record."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="devoteeId">Devotee</Label>
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
                <SelectValue placeholder="Select a devotee" />
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
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                items={Object.fromEntries(PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label]))}
              >
                <SelectTrigger id="paymentMethod" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Select value={purposePreset} onValueChange={(value) => setPurposePreset(value ?? "")}>
              <SelectTrigger id="purpose" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DONATION_PURPOSE_PRESETS.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {preset}
                  </SelectItem>
                ))}
                <SelectItem value={DONATION_PURPOSE_OTHER}>{DONATION_PURPOSE_OTHER}</SelectItem>
              </SelectContent>
            </Select>
            {purposePreset === DONATION_PURPOSE_OTHER && (
              <Input
                placeholder="Describe the purpose"
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                required
              />
            )}
          </div>

          <DateTimeField id="donatedAt" label="Donation date" value={donatedAt} onChange={setDonatedAt} required />

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
