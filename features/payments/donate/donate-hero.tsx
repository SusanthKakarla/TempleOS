import Image from "next/image";
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
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#E85D04]/10 text-lg font-semibold text-[#E85D04]">
      {initial}
    </div>
  );
}

/**
 * Campaign Banner — the temple's own uploaded image when set, otherwise the
 * official TempleOS default banner (public/default-campaign-banner.png, a
 * real image asset — not CSS/SVG). Fixed height (200px mobile / 300px
 * desktop, never a viewport takeover), rounded bottom corners, soft shadow.
 * The Campaign Card below overlaps it by a fixed 40px for visual depth.
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
      <div className="relative z-0 h-[200px] w-full overflow-hidden rounded-b-2xl shadow-md sm:h-[300px]">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset next/image isn't configured for
          <img src={bannerUrl} alt="" className="size-full object-cover" />
        ) : (
          <Image
            src="/default-campaign-banner.png"
            alt=""
            width={1252}
            height={752}
            className="size-full object-cover"
            priority={false}
          />
        )}
        {/* Blends the banner's saffron/orange into the page's warm cream background instead of ending on a hard color break. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FFF8F1] to-transparent" aria-hidden="true" />
      </div>

      <div className="relative z-10 mx-auto -mt-10 max-w-[760px] px-5 md:px-6">
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[20px] border border-[#F1E3D3] bg-white p-6 shadow-sm duration-500">
          <div className="flex items-center gap-3">
            <TempleMonogram name={templeName} />
            <p className="text-xs font-medium tracking-[0.1em] text-[#8C7B6D] uppercase">{templeName}</p>
          </div>

          <h1 className="mt-4 font-heading text-2xl leading-[1.25] text-[#2D1B12] sm:text-3xl">{campaignTitle}</h1>

          <p className="mt-3 text-sm text-[#6B5B4F]">{subtitle}</p>

          {goalAmount > 0 && (
            <div className="mt-4 space-y-3">
              <DonateProgress value={displayPercentage} />
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#2D1B12]">{formatInr(raisedAmount)} raised</span>
                <span className="text-[#8C7B6D]">
                  {displayPercentage}% of {formatInr(goalAmount)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#8C7B6D]">
                {donorCount > 0 && <span>{donorCount === 1 ? "1 donor" : `${donorCount} donors`}</span>}
                {daysLeft !== null && <span>{daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}</span>}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-4">
            <Button
              id="hero-donate-button"
              size="xl"
              className="flex-1 bg-[#E85D04] text-white hover:bg-[#D9480F]"
              render={<a href="#donate" />}
            >
              <Heart className="size-4" data-icon="inline-start" aria-hidden="true" />
              Donate Now
            </Button>
            <ShareButton title={campaignTitle} url={shareUrl} size="xl" className="border-[#F1E3D3] text-[#2D1B12] hover:bg-[#FFF6ED]" />
          </div>
        </div>
      </div>
    </section>
  );
}
