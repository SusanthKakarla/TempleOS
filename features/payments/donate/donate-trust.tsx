import { CheckCircle2 } from "lucide-react";
import type { PaymentProviderKey } from "@/types/db";

const PROVIDER_LABEL: Record<PaymentProviderKey, string> = {
  razorpay: "Razorpay",
  phonepe: "PhonePe",
  stripe: "Stripe",
  cashfree: "Cashfree",
  payu: "PayU",
  upi_manual: "UPI",
};

interface DonateTrustProps {
  providerKey: PaymentProviderKey | null;
}

/**
 * "Why you can trust this campaign" — near the footer. Unlike
 * DonateTrustIndicators (the generic compact row right under the CTA), this
 * one is provider-aware: it reflects the tenant's actual connected payment
 * method, including the accurate "Manually Verified by Temple" wording for
 * the gateway-free UPI flow (V0 has no automatic receipt there — claiming
 * "Instant Receipt" would be false for that path).
 */
export function DonateTrust({ providerKey }: DonateTrustProps) {
  const items =
    providerKey === "upi_manual"
      ? [
          // V0: no gateway sits between the donor and the temple, and there's
          // no automatic receipt (that's a manual admin step) — "Instant
          // Receipt" would be a false claim here, unlike the gateway path.
          `Secure ${PROVIDER_LABEL[providerKey]}`,
          "Verified Temple",
          "Manually Verified by Temple",
          "Money goes directly to the Temple",
        ]
      : [
          `Secure ${providerKey ? (PROVIDER_LABEL[providerKey] ?? "Payments") : "Payments"}`,
          "Verified Temple",
          "Instant Receipt",
          "Money goes directly to the Temple",
        ];

  return (
    <section className="mx-auto max-w-[640px] px-5 py-8 sm:px-6">
      <h2 className="font-heading text-2xl font-semibold text-[#2F211B] sm:text-[26px]">Why you can trust this campaign</h2>
      <div className="mt-4 flex flex-col gap-2.5">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-[#2F211B]">
            <CheckCircle2 className="size-4 shrink-0 text-[#D7B53A]" aria-hidden="true" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
