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

/** "Is this safe" — placed right after the ask, the standard high-conversion position for trust signals. */
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
          "Money goes directly to Temple",
        ]
      : [
          `Secure ${providerKey ? (PROVIDER_LABEL[providerKey] ?? "Payments") : "Payments"}`,
          "Verified Temple",
          "Instant Receipt",
          "Money goes directly to Temple",
        ];

  return (
    <section className="animate-in fade-in duration-500 mx-auto max-w-[760px] px-5 md:px-6">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-[#F3E7DA] pt-8">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-xs text-[#6B5B4F]">
            <CheckCircle2 className="size-3.5 shrink-0 text-[#D4AF37]" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
