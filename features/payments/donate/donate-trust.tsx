import { CheckCircle2 } from "lucide-react";
import type { PaymentProviderKey } from "@/types/db";

const PROVIDER_LABEL: Record<PaymentProviderKey, string> = {
  razorpay: "Razorpay",
  phonepe: "PhonePe",
  stripe: "Stripe",
  cashfree: "Cashfree",
  payu: "PayU",
};

interface DonateTrustProps {
  providerKey: PaymentProviderKey;
}

/** "Is this safe" — placed right after the ask, the standard high-conversion position for trust signals. */
export function DonateTrust({ providerKey }: DonateTrustProps) {
  const items = [
    `Secure ${PROVIDER_LABEL[providerKey] ?? "Payments"}`,
    "Verified Temple",
    "Instant Receipt",
    "Money goes directly to Temple",
  ];

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-lg px-5 py-10 duration-700 md:px-6">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-sm text-[#2D2D2D]/75">
            <CheckCircle2 className="size-4 shrink-0 text-[#8B1E1E]" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
