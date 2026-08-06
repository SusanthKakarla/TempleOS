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
    <section className="animate-in fade-in duration-500 mx-auto max-w-[760px] px-5 md:px-6">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-[#F3E7DA] pt-8">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-xs text-[#6B5B4F]">
            <CheckCircle2 className="size-3.5 shrink-0 text-[#F97316]" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
