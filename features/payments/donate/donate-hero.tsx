import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/currency";
import { ShareButton } from "@/features/payments/share-button";
import { DonateProgress } from "./donate-progress";

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
 * Bounded banner-then-card hero (max ~35-45vh in practice, not a viewport
 * takeover) — a temple banner (when present) sized to a fixed height, not
 * a full-bleed photo background, with all copy sitting on the normal page
 * background below it, not overlaid on the image. No-banner campaigns get
 * no image block at all (a monogram inline in the header row instead) —
 * deliberately never a large colored placeholder block.
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
    <section className="animate-in fade-in duration-500">
      {bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset
        <img src={bannerUrl} alt="" className="h-48 w-full object-cover sm:h-64" />
      )}

      <div className="mx-auto max-w-lg px-5 pt-5 pb-6 md:px-6">
        <div className="flex items-center gap-2.5">
          {!bannerUrl && <TempleMonogram name={templeName} />}
          <p className="text-xs font-medium tracking-[0.15em] text-[#2B2B2B]/55 uppercase">{templeName}</p>
        </div>
        <h1 className="mt-2 font-heading text-3xl leading-[1.15] text-[#2B2B2B] sm:text-4xl">{campaignTitle}</h1>
        <p className="mt-2 text-base text-[#2B2B2B]/70">{subtitle}</p>

        {goalAmount > 0 && (
          <div className="mt-5 space-y-2.5">
            <DonateProgress value={displayPercentage} />
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[#2B2B2B]">{formatInr(raisedAmount)} raised</span>
              <span className="text-[#2B2B2B]/60">{displayPercentage}% of {formatInr(goalAmount)}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#2B2B2B]/60">
              {donorCount > 0 && <span>{donorCount === 1 ? "1 donor" : `${donorCount} donors`}</span>}
              {daysLeft !== null && <span>{daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}</span>}
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Button size="xl" className="flex-1 bg-[#8B4513] text-white hover:bg-[#6e3610]" render={<a href="#donate" />}>
            <Heart className="size-4" data-icon="inline-start" aria-hidden="true" />
            Donate Now
          </Button>
          <ShareButton title={campaignTitle} url={shareUrl} size="xl" className="border-[#E9E4DD] text-[#2B2B2B] hover:bg-[#FAF8F5]" />
        </div>
      </div>
    </section>
  );
}
