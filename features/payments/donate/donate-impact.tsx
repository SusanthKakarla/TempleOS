import { CheckCircle2 } from "lucide-react";
import { MotionStagger, MotionStaggerItem } from "@/components/motion-reveal";
import type { CampaignTheme } from "@/lib/campaigns/campaign-theme";

/**
 * "How your donation helps" — the concrete, category-specific outcomes for
 * THIS campaign, read straight from the theme registry (campaign-theme.ts),
 * not a hardcoded list every campaign showed regardless of what it was
 * actually raising money for. Compact checkmark rows, not bordered/shadowed
 * cards — four items should cost the page almost no scroll length.
 */
export function DonateImpact({ theme }: { theme: CampaignTheme }) {
  return (
    <section className="mx-auto max-w-[640px] px-5 py-8 sm:px-6">
      <h2 className="font-heading text-2xl font-semibold text-[#2F211B] sm:text-[26px]">How your donation helps</h2>

      <MotionStagger className="mt-4 space-y-3">
        {theme.impactPoints.map((point) => (
          <MotionStaggerItem key={point}>
            <div className="flex items-center gap-3 rounded-xl border border-[#E9DED0] bg-white px-4 py-3.5">
              <CheckCircle2 className="size-4 shrink-0" style={{ color: theme.accent }} aria-hidden="true" />
              <p className="text-base text-[#2F211B]">{point}</p>
            </div>
          </MotionStaggerItem>
        ))}
      </MotionStagger>
    </section>
  );
}
