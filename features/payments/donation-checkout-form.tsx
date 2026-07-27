"use client";

import { useState } from "react";
import Script from "next/script";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LabeledInput } from "@/components/ui/labeled-input";

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

export function DonationCheckoutForm({ tenantSlug, campaignSlug, token, templeName }: DonationCheckoutFormProps) {
  const [amount, setAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  async function handleDonate() {
    setError(null);
    const numericAmount = Number(amount);
    if (!(numericAmount > 0)) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!donorName.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!scriptReady || typeof window.Razorpay !== "function") {
      setError("Payment checkout is still loading — please try again in a moment.");
      return;
    }

    setStatus("processing");
    try {
      const orderRes = await fetch(`/api/public/donate/${tenantSlug}/${campaignSlug}/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          donorName: donorName.trim(),
          donorPhone: donorPhone.trim() || null,
          donorEmail: donorEmail.trim() || null,
          isAnonymous,
        }),
      });
      const order = (await orderRes.json().catch(() => ({}))) as {
        orderId?: string;
        keyId?: string;
        amount?: number;
        currency?: string;
        transactionId?: string;
        error?: string;
      };
      if (!orderRes.ok || !order.orderId || !order.keyId || !order.transactionId) {
        throw new Error(order.error ?? "This donation link isn't available right now.");
      }

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(numericAmount * 100),
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
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-background p-8 text-center">
        <CheckCircle2 className="size-10 text-emerald-600" />
        <p className="text-lg font-semibold">Thank you for your donation!</p>
        <p className="text-sm text-muted-foreground">A confirmation and receipt will be sent to you shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-background p-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" onReady={() => setScriptReady(true)} />

      <LabeledInput
        id="donation-amount"
        label="Amount (INR)"
        type="number"
        min="1"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        required
      />
      <LabeledInput
        id="donor-name"
        label="Your name"
        value={donorName}
        onChange={(event) => setDonorName(event.target.value)}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LabeledInput
          id="donor-phone"
          label="Phone (optional)"
          value={donorPhone}
          onChange={(event) => setDonorPhone(event.target.value)}
        />
        <LabeledInput
          id="donor-email"
          label="Email (optional)"
          type="email"
          value={donorEmail}
          onChange={(event) => setDonorEmail(event.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(checked === true)} />
        Donate anonymously
      </label>

      {status === "cancelled" && <p className="text-sm text-muted-foreground">Payment cancelled — you can try again.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleDonate} disabled={status === "processing"} className="w-full">
        {status === "processing" ? <Loader2 className="size-4 animate-spin" /> : null}
        {status === "processing" ? "Processing..." : "Donate Now"}
      </Button>
    </div>
  );
}
