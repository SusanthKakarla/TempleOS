import { CheckCircle2 } from "lucide-react";

const ITEMS = ["Verified Temple", "Secure Payment", "Direct Temple Donation"];

/**
 * Compact trust row immediately below the Campaign Summary/CTA — the
 * standard high-conversion position for reassurance. A single wrapping row
 * of small checkmarks, not cards, so it costs almost no vertical space.
 * Distinct from DonateTrust (donate-trust.tsx) near the footer, which is
 * provider-aware (reflects the tenant's actual connected payment method)
 * and titled "Why you can trust this campaign" — this one is generic and
 * static, meant to be read in under a second.
 */
export function DonateTrustIndicators() {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {ITEMS.map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-sm text-[#2F211B]">
            <CheckCircle2 className="size-4 shrink-0 text-[#D7B53A]" aria-hidden="true" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
