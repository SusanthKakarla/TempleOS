"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { ArrowRight, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
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
}

type Status = "idle" | "processing" | "success" | "cancelled" | "error";

const PRESET_AMOUNTS = [101, 501, 1001, 5001];

export function DonationCheckoutForm({ tenantSlug, campaignSlug, token, templeName }: DonationCheckoutFormProps) {
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
        error?: string;
      };
      if (!orderRes.ok || !order.orderId || !order.transactionId) {
        throw new Error(order.error ?? "This donation link isn't available right now.");
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
      <div id="donate" className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl bg-white p-8 text-center border border-[#E9E4DD]">
        <CheckCircle2 className="size-10 text-emerald-600" />
        <p className="font-heading text-lg text-[#2B2B2B]">Thank you for your donation!</p>
        <p className="text-sm text-[#2B2B2B]/70">A confirmation and receipt will be sent to you shortly.</p>
      </div>
    );
  }

  const canSubmit = validation.success && status !== "processing";
  const donateButtonLabel = status === "processing" ? "Processing..." : "Donate Now";

  return (
    <div id="donate" className="mx-auto max-w-lg space-y-5 rounded-2xl bg-white p-6 border border-[#E9E4DD] sm:p-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" onReady={() => setScriptReady(true)} />

      <h2 className="text-center font-heading text-2xl text-[#2B2B2B]">Support This Campaign</h2>

      <div className="space-y-2">
        <Label className="text-[#2B2B2B]">Choose an amount</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                Number(amount) === preset
                  ? "border-[#8B4513] bg-[#8B4513] text-white"
                  : "border-[#E9E4DD] bg-white text-[#2B2B2B] hover:border-[#C6922F] hover:bg-[#FAF8F5]",
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
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        onBlur={() => markTouched("amount")}
        error={fieldError("amount")}
        required
      />
      <LabeledInput
        id="donor-name"
        label="Full name"
        inputSize="lg"
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
        value={donorPhone}
        onChange={(event) => setDonorPhone(event.target.value)}
        onBlur={() => markTouched("donorPhone")}
        error={fieldError("donorPhone")}
        required
      />
      <label className="flex items-center gap-2 text-sm text-[#2B2B2B]">
        <Checkbox checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(checked === true)} />
        Donate anonymously
      </label>

      <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-[#8B4513]">
          Add optional details (email, PAN, message)
          <ChevronDown className={cn("size-4 transition-transform", optionalOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 pt-4">
            <LabeledInput
              id="donor-email"
              label="Email (optional)"
              type="email"
              inputSize="lg"
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
              value={donorPan}
              onChange={(event) => setDonorPan(event.target.value.toUpperCase())}
              onBlur={() => markTouched("donorPan")}
              error={fieldError("donorPan")}
              maxLength={10}
            />
            <div className="space-y-1.5">
              <Label htmlFor="donation-message" className="text-[#2B2B2B]">
                Donation message (optional)
              </Label>
              <Textarea
                id="donation-message"
                placeholder="Add a message with your donation..."
                value={donationMessage}
                onChange={(event) => setDonationMessage(event.target.value)}
                maxLength={500}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {status === "cancelled" && <p className="text-sm text-[#2B2B2B]/60">Payment cancelled — you can try again.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleDonate}
        disabled={!canSubmit}
        size="xl"
        className="hidden w-full bg-[#8B4513] text-white hover:bg-[#6e3610] md:flex"
      >
        {status === "processing" ? <Loader2 className="size-4 animate-spin" /> : null}
        {donateButtonLabel}
      </Button>

      {/* Sticky mobile CTA — same fixed-bar technique as features/dashboard/bottom-nav-bar.tsx. Hidden until the Summary Card's own Donate button scrolls out of view (see heroButtonOutOfView above), so only one Donate CTA is ever on-screen at once. */}
      <div
        className={cn(
          "fixed inset-x-3 bottom-3 z-20 rounded-2xl bg-white/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg border border-[#E9E4DD] backdrop-blur transition-all duration-300 md:hidden",
          heroButtonOutOfView ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0",
        )}
      >
        {Number(amount) > 0 && (
          <p className="px-2 pb-1 text-center text-xs font-medium text-[#2B2B2B]/60">{formatInr(Number(amount))} selected</p>
        )}
        <Button
          onClick={handleDonate}
          disabled={!canSubmit}
          size="xl"
          className="w-full gap-1.5 bg-[#8B4513] text-white hover:bg-[#6e3610]"
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
