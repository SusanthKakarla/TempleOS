import { CheckCircle2 } from "lucide-react";
import { MotionStagger, MotionStaggerItem } from "@/components/motion-reveal";
import type { CampaignTheme } from "@/lib/campaigns/campaign-theme";
import { CampaignThemeIconGlyph } from "./campaign-theme-icon";

/**
 * "Your contribution helps" — the concrete outcomes for THIS campaign's
 * category, read straight from the theme registry.
 *
 * Replaces the two hardcoded sections this page used to carry (a generic
 * "Why Your Donation Matters" grid and an identical "Your Contribution
 * Supports" checklist) which showed the same eight items to every devotee of
 * every temple regardless of what the campaign was actually raising money
 * for — a renovation campaign advertised cow protection, and an annadanam
 * campaign advertised temple festivals.
 */
export function DonateImpact({ theme }: { theme: CampaignTheme }) {
  return (
    <section id="impact" className="mx-auto max-w-[1040px] px-5 py-14 md:px-6 md:py-16">
      <div className="flex flex-col items-center text-center">
        <div
          className="flex size-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${theme.accent}1A`, color: theme.accent }}
        >
          <CampaignThemeIconGlyph icon={theme.icon} className="size-6" />
        </div>
        <h2 className="mt-4 font-heading text-2xl text-[#2B2118] sm:text-3xl">Your Contribution Helps</h2>
        <p className="mt-2 max-w-md text-sm text-[#6B5B4F]">
          Every rupee goes towards this {theme.label.toLowerCase()} campaign at the temple.
        </p>
      </div>

      <MotionStagger className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {theme.impactPoints.map((point) => (
          <MotionStaggerItem key={point}>
            <div className="flex h-full items-start gap-3 rounded-[18px] border border-[#F3E7DA] bg-white p-5 transition-shadow duration-300 hover:shadow-[0_16px_40px_rgba(62,39,35,0.10)]">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" style={{ color: theme.accent }} aria-hidden="true" />
              <p className="text-sm leading-relaxed text-[#2B2118]">{point}</p>
            </div>
          </MotionStaggerItem>
        ))}
      </MotionStagger>
    </section>
  );
}
