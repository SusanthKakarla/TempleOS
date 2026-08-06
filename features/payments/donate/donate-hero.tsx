import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/currency";
import { ShareButton } from "@/features/payments/share-button";
import { DonateProgress } from "./donate-progress";
import { DonateBannerFallback } from "./donate-banner-fallback";

interface DonateHeroProps {
  templeName: string;
  campaignTitle: string;
  subtitle: string;
  bannerUrl: string | null;
  raisedAmount: number;
  goalAmount: number;
  donorCount: number;
  daysLeft: number | null;
  shareUrl: string;
}

function TempleMonogram({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "T";
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#8B4513]/10 text-lg font-semibold text-[#8B4513]">
      {initial}
    </div>
  );
}

/**
 * Campaign Banner (edge-to-edge image or the SVG fallback, fixed height —
 * never a viewport-height takeover) followed by the Campaign Summary Card
 * (a real bounded white card, overlapping the banner slightly). Layout is
 * identical whether a real banner or the fallback renders — same
 * container height either way.
 */
export function DonateHero({
  templeName,
  campaignTitle,
  subtitle,
  bannerUrl,
  raisedAmount,
  goalAmount,
  donorCount,
  daysLeft,
  shareUrl,
}: DonateHeroProps) {
  const rawPercentage = goalAmount > 0 ? (raisedAmount / goalAmount) * 100 : 0;
  const displayPercentage = Math.min(100, Math.round(rawPercentage));

  return (
    <section>
      <div className="h-56 w-full overflow-hidden sm:h-80">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset
          <img src={bannerUrl} alt="" className="size-full object-cover" />
        ) : (
          <DonateBannerFallback className="size-full object-cover" />
        )}
      </div>

      <div className="mx-auto -mt-6 max-w-lg px-5 md:px-6">
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-[#E9E4DD] bg-white p-5 shadow-sm duration-500 sm:p-6">
          <div className="flex items-center gap-2.5">
            <TempleMonogram name={templeName} />
            <p className="text-xs font-medium tracking-[0.1em] text-[#2B2B2B]/55 uppercase">{templeName}</p>
          </div>
          <h1 className="mt-3 font-heading text-2xl leading-[1.2] text-[#2B2B2B] sm:text-3xl">{campaignTitle}</h1>
          <p className="mt-2 text-sm text-[#2B2B2B]/70">{subtitle}</p>

          {goalAmount > 0 && (
            <div className="mt-4 space-y-2">
              <DonateProgress value={displayPercentage} />
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#2B2B2B]">{formatInr(raisedAmount)} raised</span>
                <span className="text-[#2B2B2B]/60">
                  {displayPercentage}% of {formatInr(goalAmount)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#2B2B2B]/60">
                {donorCount > 0 && <span>{donorCount === 1 ? "1 donor" : `${donorCount} donors`}</span>}
                {daysLeft !== null && <span>{daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}</span>}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button
              id="hero-donate-button"
              size="xl"
              className="flex-1 bg-[#8B4513] text-white hover:bg-[#6e3610]"
              render={<a href="#donate" />}
            >
              <Heart className="size-4" data-icon="inline-start" aria-hidden="true" />
              Donate Now
            </Button>
            <ShareButton title={campaignTitle} url={shareUrl} size="xl" className="border-[#E9E4DD] text-[#2B2B2B] hover:bg-[#FAF8F5]" />
          </div>
        </div>
      </div>
    </section>
  );
}
