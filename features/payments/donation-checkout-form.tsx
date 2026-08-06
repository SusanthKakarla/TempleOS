"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, ChevronDown, Copy, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { donationCheckoutSchema } from "@/lib/validation/payments";
import { formatInr } from "@/lib/currency";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => { open: () => void; on: (event: string, handler: () => void) => void };
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; contact?: string; email?: string };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

interface DonationCheckoutFormProps {
  tenantSlug: string;
  campaignSlug: string;
  token: string;
  templeName: string;
  /** Set only when the tenant's active provider is `upi_manual` (V0's gateway-free flow) — null for Razorpay/PhonePe tenants. */
  upi: { vpa: string; payeeName: string; qrCodeUrl: string | null } | null;
}

type Status = "idle" | "processing" | "success" | "awaiting_confirmation" | "cancelled" | "error";

const PRESET_AMOUNTS = [101, 251, 501, 1001, 5001];

/** "Soft filled" input treatment (Stripe-checkout style) — passed as `className` to every field in this form only; the shared Input/LabeledInput components keep their default bordered look everywhere else in the app. */
const FILLED_INPUT_CLASS =
  "h-[52px] rounded-[14px] border-transparent bg-[#FFF6ED] focus-visible:border-[#F97316] focus-visible:bg-white focus-visible:ring-[#F97316]/20";

export function DonationCheckoutForm({ tenantSlug, campaignSlug, token, templeName, upi }: DonationCheckoutFormProps) {
  const [amount, setAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPan, setDonorPan] = useState("");
  const [donationMessage, setDonationMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  // Avoids two simultaneously-visible "Donate" CTAs on first paint (the
  // Campaign Summary Card's own button, and this sticky bar). Hidden while
  // that button is still on-screen; appears once the user scrolls past it.
  // Defaults to visible (true) so the sticky bar still works if the hero
  // button is ever absent for some reason — it only hides once an observer
  // actually confirms the hero button is on-screen.
  const [heroButtonOutOfView, setHeroButtonOutOfView] = useState(true);

  // upi_manual only — populated once the order route returns a pending
  // transaction + upi:// link; used by the "awaiting confirmation" screen
  // below (the fallback UPI ID/QR/link, and the optional proof submission).
  const [upiTransactionId, setUpiTransactionId] = useState<string | null>(null);
  const [upiUri, setUpiUri] = useState<string | null>(null);
  const [upiAmount, setUpiAmount] = useState<number | null>(null);
  const [upiReference, setUpiReference] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmSubmitted, setConfirmSubmitted] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    const heroButton = document.getElementById("hero-donate-button");
    if (!heroButton) return;
    const observer = new IntersectionObserver(([entry]) => setHeroButtonOutOfView(!entry.isIntersecting), {
      rootMargin: "0px 0px -10% 0px",
    });
    observer.observe(heroButton);
    return () => observer.disconnect();
  }, []);

  const validation = useMemo(
    () =>
      donationCheckoutSchema.safeParse({
        amount: Number(amount),
        donorName,
        donorPhone,
        donorEmail: donorEmail.trim() || null,
        donorPan: donorPan.trim() || null,
        donationMessage: donationMessage.trim() || null,
        isAnonymous,
      }),
    [amount, donorName, donorPhone, donorEmail, donorPan, donationMessage, isAnonymous],
  );
  const fieldErrors = validation.success ? {} : validation.error.flatten().fieldErrors;
  const fieldError = (field: string) => (touched[field] ? fieldErrors[field as keyof typeof fieldErrors]?.[0] : undefined);
  const markTouched = (field: string) => setTouched((current) => ({ ...current, [field]: true }));

  async function handleCopy(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Could not copy. Please try again.");
    }
  }

  async function handleSubmitProof() {
    if (!upiTransactionId) return;
    if (!upiReference.trim() && !screenshotFile) {
      setConfirmError("Add a UPI reference or a screenshot before submitting.");
      return;
    }
    setConfirmError(null);
    setConfirmSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("transactionId", upiTransactionId);
      if (upiReference.trim()) formData.append("upiReference", upiReference.trim());
      if (screenshotFile) formData.append("screenshot", screenshotFile);

      const response = await fetch(`/api/public/donate/${tenantSlug}/${campaignSlug}/${token}/confirm`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Something went wrong. Please try again.");
      setConfirmSubmitted(true);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setConfirmSubmitting(false);
    }
  }

  async function handleDonate() {
    setError(null);
    setTouched({ amount: true, donorName: true, donorPhone: true, donorEmail: true, donorPan: true });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Please check the form for errors.");
      return;
    }
    setStatus("processing");
    try {
      const orderRes = await fetch(`/api/public/donate/${tenantSlug}/${campaignSlug}/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const order = (await orderRes.json().catch(() => ({}))) as {
        orderId?: string;
        keyId?: string;
        amount?: number;
        currency?: string;
        transactionId?: string;
        providerKey?: string;
        redirectUrl?: string | null;
        upiUri?: string | null;
        error?: string;
      };
      if (!orderRes.ok || !order.orderId || !order.transactionId) {
        throw new Error(order.error ?? "This donation link isn't available right now.");
      }

      // upi_manual: no gateway, no client SDK — just open the devotee's own
      // UPI app via the standard upi://pay link and show the "awaiting
      // confirmation" screen underneath (the browser tab stays open behind
      // the UPI app on Android; there is no callback to wait for).
      if (order.upiUri) {
        setUpiTransactionId(order.transactionId);
        setUpiUri(order.upiUri);
        setUpiAmount(validation.data.amount);
        setStatus("awaiting_confirmation");
        window.location.href = order.upiUri;
        return;
      }

      // Redirect-based providers (PhonePe) never touch a client-side JS SDK —
      // the backend already created the order, and the only thing left to
      // do is navigate to the provider-hosted checkout page. Completion is
      // resolved server-side (webhook + the /return page's Order Status
      // poll), never trusted from this redirect alone.
      if (order.redirectUrl) {
        window.location.assign(order.redirectUrl);
        return;
      }

      if (!order.keyId) {
        throw new Error("This donation link isn't available right now.");
      }
      if (!scriptReady || typeof window.Razorpay !== "function") {
        setStatus("idle");
        setError("Payment checkout is still loading — please try again in a moment.");
        return;
      }

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(validation.data.amount * 100),
        currency: order.currency ?? "INR",
        order_id: order.orderId,
        name: templeName,
        description: "Donation",
        prefill: { name: donorName, contact: donorPhone || undefined, email: donorEmail || undefined },
        handler: (response) => {
          setStatus("success");
          void fetch("/api/public/donate/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: order.transactionId,
              providerOrderId: response.razorpay_order_id,
              providerPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
        },
        modal: {
          ondismiss: () => setStatus((current) => (current === "success" ? current : "cancelled")),
        },
      });
      razorpay.on("payment.failed", () => setStatus("error"));
      razorpay.open();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div id="donate" className="mx-auto flex max-w-[760px] flex-col items-center gap-3 rounded-[24px] border border-[#F3E7DA] bg-white p-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        <CheckCircle2 className="size-10 text-emerald-600" />
        <p className="font-heading text-lg text-[#2B2118]">Thank you for your donation!</p>
        <p className="text-sm text-[#6B5B4F]">A confirmation and receipt will be sent to you shortly.</p>
      </div>
    );
  }

  if (status === "awaiting_confirmation") {
    return (
      <div id="donate" className="mx-auto max-w-[760px] space-y-7 rounded-[24px] border border-[#F3E7DA] bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-10 text-emerald-600" />
          <p className="font-heading text-lg text-[#2B2118]">Thank you for your donation.</p>
          <p className="text-sm text-[#6B5B4F]">
            Once the temple confirms your payment, your donation will be recorded.
          </p>
        </div>

        {upi && (
          <div className="space-y-4 rounded-[14px] bg-[#FFF6ED] p-4">
            <p className="text-sm font-medium text-[#2B2118]">Didn&apos;t open automatically?</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {upi.qrCodeUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset
                <img src={upi.qrCodeUrl} alt="" className="hidden size-32 shrink-0 rounded-lg border border-[#F3E7DA] object-cover md:block" />
              )}
              <div className="min-w-0 flex-1 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#6B5B4F]">UPI ID</span>
                  <span className="font-medium text-[#2B2118]">{upi.vpa}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#6B5B4F]">Payee Name</span>
                  <span className="font-medium text-[#2B2118]">{upi.payeeName}</span>
                </div>
                {upiAmount !== null && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6B5B4F]">Amount</span>
                    <span className="font-medium text-[#2B2118]">{formatInr(upiAmount)}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => handleCopy(upi.vpa, "UPI ID copied to clipboard.")}>
                    <Copy className="size-3.5" />
                    Copy UPI ID
                  </Button>
                  {upiUri && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleCopy(upiUri, "UPI link copied to clipboard.")}
                    >
                      <Copy className="size-3.5" />
                      Copy UPI Link
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmSubmitted ? (
          <p className="rounded-[14px] bg-[#FFF6ED] p-4 text-center text-sm text-[#6B5B4F]">
            Thanks — we&apos;ve recorded your submission for the temple to verify.
          </p>
        ) : (
          <div className="space-y-3">
            <Label className="text-[#2B2118]">Add proof of payment (optional)</Label>
            <LabeledInput
              id="upi-reference"
              label="UPI reference number"
              placeholder="e.g. 123456789012"
              inputSize="lg"
              className={FILLED_INPUT_CLASS}
              value={upiReference}
              onChange={(event) => setUpiReference(event.target.value)}
            />
            <label
              htmlFor="upi-screenshot"
              className="flex h-[52px] cursor-pointer items-center justify-between rounded-[14px] border border-transparent bg-[#FFF6ED] px-4 text-sm text-[#6B5B4F]"
            >
              <span className="truncate">{screenshotFile ? screenshotFile.name : "Upload payment screenshot"}</span>
              <Upload className="size-4 shrink-0" />
              <input
                id="upi-screenshot"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => setScreenshotFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
            <Button
              type="button"
              disabled={confirmSubmitting}
              className="w-full rounded-full bg-[#F97316] text-white hover:bg-[#EA580C]"
              onClick={handleSubmitProof}
            >
              {confirmSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        )}
      </div>
    );
  }

  const canSubmit = validation.success && status !== "processing";
  const donateButtonLabel = status === "processing" ? "Processing..." : "Donate Now";

  return (
    <div id="donate" className="mx-auto max-w-[760px] space-y-7 rounded-[24px] border border-[#F3E7DA] bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" onReady={() => setScriptReady(true)} />

      <h2 className="text-center font-heading text-2xl text-[#2B2118]">Support This Campaign</h2>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-[#2B2118]">Choose an amount</Label>
          <div className="flex flex-wrap gap-3">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className={cn(
                  "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                  Number(amount) === preset
                    ? "scale-[1.05] border-[#F97316] bg-[#F97316] text-white shadow-sm"
                    : "border-[#F3E7DA] bg-[#FFF6ED] text-[#2B2118] hover:border-[#F97316] hover:bg-white",
                )}
              >
                {formatInr(preset)}
              </button>
            ))}
          </div>
        </div>

        <LabeledInput
          id="donation-amount"
          label="Other amount (INR)"
          type="number"
          min="1"
          inputSize="lg"
          className={FILLED_INPUT_CLASS}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          onBlur={() => markTouched("amount")}
          error={fieldError("amount")}
          required
        />
      </div>

      <div className="space-y-5">
        <LabeledInput
          id="donor-name"
          label="Full name"
          inputSize="lg"
          className={FILLED_INPUT_CLASS}
          value={donorName}
          onChange={(event) => setDonorName(event.target.value)}
          onBlur={() => markTouched("donorName")}
          error={fieldError("donorName")}
          required
        />
        <LabeledInput
          id="donor-phone"
          label="Mobile number"
          inputSize="lg"
          className={FILLED_INPUT_CLASS}
          value={donorPhone}
          onChange={(event) => setDonorPhone(event.target.value)}
          onBlur={() => markTouched("donorPhone")}
          error={fieldError("donorPhone")}
          required
        />
        <label className="flex items-center gap-2 text-sm text-[#2B2118]">
          <Checkbox checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(checked === true)} />
          Donate anonymously
        </label>
      </div>

      <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen} className="my-4">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-[#F97316]">
          Add optional details (email, PAN, message)
          <ChevronDown className={cn("size-4 transition-transform", optionalOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-5 pt-4">
            <LabeledInput
              id="donor-email"
              label="Email (optional)"
              type="email"
              inputSize="lg"
              className={FILLED_INPUT_CLASS}
              value={donorEmail}
              onChange={(event) => setDonorEmail(event.target.value)}
              onBlur={() => markTouched("donorEmail")}
              error={fieldError("donorEmail")}
            />
            <LabeledInput
              id="donor-pan"
              label="PAN (optional)"
              placeholder="AAAAA9999A"
              inputSize="lg"
              className={FILLED_INPUT_CLASS}
              value={donorPan}
              onChange={(event) => setDonorPan(event.target.value.toUpperCase())}
              onBlur={() => markTouched("donorPan")}
              error={fieldError("donorPan")}
              maxLength={10}
            />
            <div className="space-y-2">
              <Label htmlFor="donation-message" className="text-[#2B2118]">
                Donation message (optional)
              </Label>
              <Textarea
                id="donation-message"
                placeholder="Add a message with your donation..."
                value={donationMessage}
                onChange={(event) => setDonationMessage(event.target.value)}
                maxLength={500}
                className={FILLED_INPUT_CLASS}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {status === "cancelled" && <p className="text-sm text-[#8C7B6D]">Payment cancelled — you can try again.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleDonate}
        disabled={!canSubmit}
        size="xl"
        className="hidden w-full rounded-full bg-[#F97316] text-white hover:bg-[#EA580C] md:flex"
      >
        {status === "processing" ? <Loader2 className="size-4 animate-spin" /> : null}
        {donateButtonLabel}
      </Button>

      {/* Sticky mobile CTA — same fixed-bar technique as features/dashboard/bottom-nav-bar.tsx. Hidden until the Summary Card's own Donate button scrolls out of view (see heroButtonOutOfView above), so only one Donate CTA is ever on-screen at once. */}
      <div
        className={cn(
          "fixed inset-x-3 bottom-3 z-20 rounded-2xl bg-white/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg border border-[#F3E7DA] backdrop-blur transition-all duration-300 md:hidden",
          heroButtonOutOfView ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0",
        )}
      >
        {Number(amount) > 0 && (
          <p className="px-2 pb-1 text-center text-xs font-medium text-[#8C7B6D]">{formatInr(Number(amount))} selected</p>
        )}
        <Button
          onClick={handleDonate}
          disabled={!canSubmit}
          size="xl"
          className="w-full gap-1.5 rounded-full bg-[#F97316] text-white hover:bg-[#EA580C]"
        >
          {status === "processing" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              {Number(amount) > 0 ? "Donate Securely" : donateButtonLabel}
              <ArrowRight className="size-4" data-icon="inline-end" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
      <div className="h-24 md:hidden" aria-hidden />
    </div>
  );
}
