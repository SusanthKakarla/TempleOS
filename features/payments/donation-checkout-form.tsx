"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Script from "next/script";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, CalendarX2, CheckCircle2, ChevronDown, Copy, Download, Loader2, Lock, Maximize2, PartyPopper, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { donationCheckoutSchema } from "@/lib/validation/payments";
import type { DonationBlockedReason } from "@/lib/payments/donation-checkout-service";
import { formatInr } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { ImageLightbox } from "@/components/image-lightbox";
import { buildUpiAppLinks, detectUpiPlatformFromBrowser } from "@/lib/upi-deep-link";

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
  /** False when the campaign page renders but isn't currently accepting payments (not started / ended / paused / archived / payment not configured) — see donation-checkout-service.ts's page-viewable-vs-payment-allowed split. */
  canDonate: boolean;
  blockedReason: DonationBlockedReason | null;
}

type Status = "idle" | "processing" | "success" | "awaiting_confirmation" | "cancelled" | "error";

const PRESET_AMOUNTS_ROW_1 = [101, 251, 501];
const PRESET_AMOUNTS_ROW_2 = [1001, 5001];

/** The platform never changes mid-session, so the store has nothing to subscribe to. */
const subscribeToNothing = () => () => {};

/** Every text input in this form: visible border, white background, dark readable text — never a pale fill that makes placeholders hard to read. */
const FILLED_INPUT_CLASS =
  "h-[52px] rounded-[14px] border border-[#E3D8CC] bg-white text-base text-[#2F211B] placeholder:text-[#8A7D72] focus-visible:border-[#D7B53A] focus-visible:ring-[#D7B53A]/25";

const BLOCKED_COPY: Record<DonationBlockedReason, { icon: ReactNode; title: string; description: string }> = {
  not_started: {
    icon: <CalendarClock className="size-10 text-[#D98200]" />,
    title: "This campaign hasn't started yet",
    description: "Donations will open once the campaign begins. Please check back later.",
  },
  expired: {
    icon: <CalendarX2 className="size-10 text-[#D98200]" />,
    title: "This campaign is no longer accepting donations.",
    description: "Thank you for your support.",
  },
  disabled: {
    icon: <PauseCircle className="size-10 text-[#D98200]" />,
    title: "This campaign is no longer accepting donations.",
    description: "Thank you for your support.",
  },
  // Deliberately worded as a payment-setup problem, never as "this campaign
  // has ended" — the campaign is running fine, the temple just hasn't
  // connected a UPI ID yet, and conflating the two sends devotees away from
  // a live campaign.
  payment_not_configured: {
    icon: <PauseCircle className="size-10 text-[#D98200]" />,
    title: "Online donations are temporarily unavailable for this temple",
    description: "The temple hasn't finished setting up online payments yet. Please check back later or contact the temple directly to donate.",
  },
  goal_reached: {
    icon: <PartyPopper className="size-10 text-[#D98200]" />,
    title: "This campaign has reached its donation goal.",
    description: "Thank you for your support.",
  },
};

export function DonationCheckoutForm({
  tenantSlug,
  campaignSlug,
  token,
  templeName,
  upi,
  canDonate,
  blockedReason,
}: DonationCheckoutFormProps) {
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

  // upi_manual only — populated once the order route returns a pending
  // transaction + upi:// link; used by the "awaiting confirmation" screen
  // below (the fallback UPI ID/QR/link, and the optional proof submission).
  const [upiUri, setUpiUri] = useState<string | null>(null);
  const [upiAmount, setUpiAmount] = useState<number | null>(null);
  const [qrZoomed, setQrZoomed] = useState(false);
  // The server has no user agent to judge by, so it renders the safe answer
  // (no deep link — QR and copy only) and the client swaps in the real one on
  // hydration. useSyncExternalStore rather than an effect so those two never
  // disagree mid-render.
  const upiPlatform = useSyncExternalStore(
    subscribeToNothing,
    () => detectUpiPlatformFromBrowser(navigator),
    () => "none" as const,
  );



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

  /**
   * Saves the QR rather than opening it. The `download` attribute is ignored
   * for a cross-origin URL (the QR lives on ImageKit), so the bytes are
   * fetched and handed over as a blob; if that is blocked, opening the image
   * in a new tab still lets the devotee long-press or right-click to save.
   */
  async function handleDownloadQr(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not fetch the QR code");
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${templeName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-upi-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
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
        setUpiUri(order.upiUri);
        setUpiAmount(validation.data.amount);
        setStatus("awaiting_confirmation");
        // Deliberately NOT navigating to the upi:// link here. Doing it
        // automatically meant an iPhone or Mac devotee was ambushed with
        // 'allow this website to open "WhatsApp"?' before they had done
        // anything — WhatsApp registers the upi:// scheme and Apple
        // platforms have no app chooser. The handoff is now a tap on the
        // next screen, and only offered where it can actually work.
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

  if (!canDonate && blockedReason) {
    const copy = BLOCKED_COPY[blockedReason];
    return (
      <div className="flex flex-col items-center gap-3 p-6 pb-8 text-center">
        {copy.icon}
        <p className="font-heading text-lg text-[#2F211B]">{copy.title}</p>
        <p className="text-sm text-[#756A61]">{copy.description}</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 p-6 pb-8 text-center">
        <CheckCircle2 className="size-10 text-emerald-600" />
        <p className="font-heading text-lg text-[#2F211B]">Thank you for your donation!</p>
        <p className="text-sm text-[#756A61]">A confirmation and receipt will be sent to you shortly.</p>
      </div>
    );
  }

  if (status === "awaiting_confirmation") {
    return (
      <div className="space-y-6 p-1 pb-6">
        {/*
          Deliberately NOT "thank you, payment received": upi_manual gives
          TempleOS no confirmation that money actually moved, so claiming
          success here would be a lie the temple then has to walk back.
        */}
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-10 text-emerald-600" />
          <p className="font-heading text-lg text-[#2F211B]">Payment initiated</p>
          <p className="text-sm text-[#756A61]">
            Complete the payment in your UPI app. Once the temple confirms it, your donation will be recorded.
          </p>
        </div>

        {/*
          Android already has an OS-level chooser, so one generic upi:// link
          is enough and covers every installed UPI app.
        */}
        {upiUri && upiPlatform === "android" && (
          <>
            <Button
              size="xl"
              className="w-full rounded-full bg-[#D98200] text-white hover:bg-[#E28700]"
              render={<a href={upiUri} />}
            >
              {upiAmount !== null ? `Pay ${formatInr(upiAmount)} via UPI` : "Pay via UPI"}
              <ArrowRight className="size-4" data-icon="inline-end" aria-hidden="true" />
            </Button>
            <p className="text-center text-xs text-[#756A61]">
              Choose PhonePe, Google Pay, Paytm, BHIM, or any UPI app.
            </p>
          </>
        )}

        {/*
          iOS has no chooser of its own — it hands a scheme to whichever app
          claims it, and WhatsApp claims upi:// — so the chooser is built here
          instead, one button per app's own scheme. Each is handed the exact
          same payment query. An app that isn't installed simply does nothing
          when tapped, which is why the QR and copyable UPI ID stay below.
        */}
        {upiUri && upiPlatform === "ios" && (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-[#2F211B]">
              {upiAmount !== null ? `Pay ${formatInr(upiAmount)} with` : "Pay with"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {buildUpiAppLinks(upiUri).map((app) => (
                <Button
                  key={app.name}
                  size="lg"
                  variant="outline"
                  className="w-full justify-center rounded-full border-[#E9DED0] text-[#2F211B] hover:bg-[#FFF8E8]"
                  render={<a href={app.href} />}
                >
                  {app.name}
                </Button>
              ))}
            </div>
            <p className="text-center text-xs text-[#756A61]">
              Nothing happened? That app may not be installed — scan the QR code below with any UPI app instead.
            </p>
          </div>
        )}

        {upiUri && upiPlatform === "none" && (
          <p className="rounded-[14px] bg-[#FFF8E8] p-3 text-center text-sm text-[#756A61]">
            {upi?.qrCodeUrl
              ? "Scan the QR code below with any UPI app, or copy the UPI ID and pay from your phone."
              : "Copy the UPI ID below and pay from any UPI app on your phone."}
          </p>
        )}

        {upi && (
          <div className="space-y-4 rounded-[14px] bg-[#FFF8E8] p-4">
            {/*
              QR first and large: on a laptop it is the only way to pay (no
              app can claim upi:// there), and on a phone it is what someone
              points a second device at. Tapping it opens the full-screen
              view, because a 200px QR photographed off a screen at an angle
              is exactly the case that fails to scan.
            */}
            {upi.qrCodeUrl && (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQrZoomed(true)}
                  className="rounded-2xl border border-[#E9DED0] bg-white p-2 transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-[#D98200] focus-visible:outline-none"
                  aria-label="Enlarge the UPI QR code"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset */}
                  <img
                    src={upi.qrCodeUrl}
                    alt="UPI QR code for this temple"
                    className="size-52 rounded-lg object-contain sm:size-60"
                  />
                </button>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setQrZoomed(true)}>
                    <Maximize2 className="size-3.5" />
                    Enlarge
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDownloadQr(upi.qrCodeUrl!)}
                  >
                    <Download className="size-3.5" />
                    Download QR
                  </Button>
                </div>
              </div>
            )}

            <p className="text-sm font-medium text-[#2F211B]">Didn&apos;t open automatically?</p>
            {/*
              A VPA is one long unbreakable token. With `justify-between` and
              no shrink rules, the label collapsed to its narrowest wrap
              ("UPI" / "ID" on two lines) while the value still couldn't
              shrink below min-content and overflowed the card. Labels hold
              their width; values wrap within what's left.
            */}
            <div className="min-w-0 space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-[#756A61]">UPI ID</span>
                <span className="min-w-0 text-right font-medium break-all text-[#2F211B]">{upi.vpa}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-[#756A61]">Payee Name</span>
                <span className="min-w-0 text-right font-medium break-words text-[#2F211B]">{upi.payeeName}</span>
              </div>
              {upiAmount !== null && (
                <div className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-[#756A61]">Amount</span>
                  <span className="shrink-0 font-medium text-[#2F211B]">{formatInr(upiAmount)}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => handleCopy(upi.vpa, "UPI ID copied to clipboard.")}>
                  <Copy className="size-3.5" />
                  Copy UPI ID
                </Button>
                {upiUri && upiPlatform === "android" && (
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
        )}

        {qrZoomed && upi?.qrCodeUrl && (
          <ImageLightbox src={upi.qrCodeUrl} alt="UPI QR code for this temple" onClose={() => setQrZoomed(false)} />
        )}

      </div>
    );
  }

  const canSubmit = validation.success && status !== "processing";
  const amountNum = Number(amount);
  const donateButtonLabel =
    status === "processing" ? "Processing..." : amountNum > 0 ? `Donate ${formatInr(amountNum)}` : "Donate Now";

  return (
    <div className="space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" onReady={() => setScriptReady(true)} />

      <div className="space-y-3">
        <Label className="text-sm font-medium text-[#2F211B]">Choose an amount</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_AMOUNTS_ROW_1.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={cn(
                "min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition-all duration-200",
                Number(amount) === preset
                  ? "border-[#D98200] bg-[#D98200] text-white"
                  : "border-[#E9DED0] bg-white text-[#2F211B] hover:border-[#D98200]",
              )}
            >
              {formatInr(preset)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_AMOUNTS_ROW_2.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={cn(
                "min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition-all duration-200",
                Number(amount) === preset
                  ? "border-[#D98200] bg-[#D98200] text-white"
                  : "border-[#E9DED0] bg-white text-[#2F211B] hover:border-[#D98200]",
              )}
            >
              {formatInr(preset)}
            </button>
          ))}
        </div>

        <LabeledInput
          id="donation-amount"
          label="Other amount"
          type="number"
          inputMode="numeric"
          min="1"
          icon={<span className="text-base font-medium text-[#756A61]">₹</span>}
          placeholder="Enter amount"
          inputSize="lg"
          className={cn(FILLED_INPUT_CLASS, "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          onBlur={() => markTouched("amount")}
          error={fieldError("amount")}
          required
        />
      </div>

      <div className="space-y-4">
        <p className="font-heading text-sm font-semibold text-[#2F211B]">Your details</p>
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
          requiredLabel="Required"
        />
        <LabeledInput
          id="donor-phone"
          label="Mobile number"
          placeholder="+91 98765 43210"
          inputSize="lg"
          className={FILLED_INPUT_CLASS}
          value={donorPhone}
          onChange={(event) => setDonorPhone(event.target.value)}
          onBlur={() => markTouched("donorPhone")}
          error={fieldError("donorPhone")}
          required
          requiredLabel="Required"
        />
        <div>
          <label className="flex items-center gap-2 text-sm text-[#2F211B]">
            <Checkbox
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked === true)}
              className="border-[#E3D8CC] bg-white data-checked:border-[#D7B53A] data-checked:bg-[#D7B53A] data-checked:text-white"
            />
            Donate anonymously
          </label>
          <p className="mt-1 pl-6 text-xs text-[#756A61]">Your name will not be displayed publicly.</p>
        </div>
      </div>

      <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-[#D98200]">
          <span>{optionalOpen ? "−" : "+"} Add optional details</span>
          <ChevronDown className={cn("size-4 transition-transform", optionalOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 pt-4">
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
              <Label htmlFor="donation-message" className="text-[#2F211B]">
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

      {status === "cancelled" && <p className="text-sm text-[#756A61]">Payment cancelled — you can try again.</p>}
      {error && <p className="text-sm text-[#B3261E]">{error}</p>}

      <div className="sticky bottom-0 -mx-5 space-y-2 border-t border-[#E9DED0] bg-[#FFFDF9] px-5 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <p className="flex items-center justify-center gap-1.5 text-xs text-[#756A61]">
          <Lock className="size-3.5" aria-hidden="true" />
          Secure payment
        </p>
        <Button
          onClick={handleDonate}
          disabled={!canSubmit}
          size="xl"
          className="h-[52px] w-full rounded-full bg-[#D98200] text-base font-semibold text-white hover:bg-[#E28700]"
        >
          {status === "processing" ? <Loader2 className="size-4 animate-spin" /> : null}
          {donateButtonLabel}
        </Button>
      </div>
    </div>
  );
}
