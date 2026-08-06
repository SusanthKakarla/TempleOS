import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatInr } from "@/lib/currency";
import { ShareButton } from "@/features/payments/share-button";

interface DonateHeroProps {
  templeName: string;
  campaignTitle: string;
  subtitle: string;
  bannerUrl: string | null;
  raisedAmount: number;
  goalAmount: number;
  shareUrl: string;
}

function TempleMonogram({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "T";
  return (
    <div className="flex size-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm">
      {initial}
    </div>
  );
}

/**
 * Full-bleed hero — the single biggest lever for "why should I donate,"
 * so it owns the whole first screen instead of competing with a small
 * monogram+card the old layout opened with. `min-h-[100dvh]` (not `100vh`)
 * avoids the mobile-browser-chrome jump on load; shorter on desktop where
 * there's no such issue and users expect to see more content immediately.
 */
export function DonateHero({
  templeName,
  campaignTitle,
  subtitle,
  bannerUrl,
  raisedAmount,
  goalAmount,
  shareUrl,
}: DonateHeroProps) {
  const rawPercentage = goalAmount > 0 ? (raisedAmount / goalAmount) * 100 : 0;
  const displayPercentage = Math.min(100, Math.round(rawPercentage));

  return (
    <section className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden md:min-h-0 md:justify-center md:py-24">
      <div className="absolute inset-0">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset
          <img src={bannerUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-[linear-gradient(160deg,#8B1E1E_0%,#5c1414_100%)]" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.25)_0%,rgba(0,0,0,0.45)_55%,rgba(0,0,0,0.8)_100%)]" />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 relative z-10 mx-auto w-full max-w-lg px-5 pt-24 pb-8 duration-700 md:px-6">
        {!bannerUrl && (
          <div className="mb-6 flex justify-center">
            <TempleMonogram name={templeName} />
          </div>
        )}
        <p className="text-center text-xs font-medium tracking-[0.2em] text-white/80 uppercase">{templeName}</p>
        <h1 className="mt-2 text-center font-heading text-3xl leading-tight text-white sm:text-4xl">{campaignTitle}</h1>
        <p className="mt-3 text-center text-base text-white/85">{subtitle}</p>

        {goalAmount > 0 && (
          <div className="mt-8 space-y-2 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <div className="[&_[data-slot=progress-track]]:bg-white/20 [&_[data-slot=progress-indicator]]:bg-[#D4AF37]">
              <Progress value={displayPercentage} />
            </div>
            <div className="flex items-center justify-between text-sm text-white">
              <span className="font-semibold">{formatInr(raisedAmount)} raised</span>
              <span className="text-white/75">of {formatInr(goalAmount)} goal</span>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            size="xl"
            className="bg-[#8B1E1E] text-white hover:bg-[#7a1a1a] sm:flex-1"
            render={<a href="#donate" />}
          >
            <Heart className="size-4" data-icon="inline-start" aria-hidden="true" />
            Donate Now
          </Button>
          <ShareButton
            title={campaignTitle}
            url={shareUrl}
            size="xl"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          />
        </div>
      </div>
    </section>
  );
}
