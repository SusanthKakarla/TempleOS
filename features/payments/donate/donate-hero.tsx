import { Heart, ShieldCheck, Users } from "lucide-react";
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
  donorCount,
  shareUrl,
}: DonateHeroProps) {
  const rawPercentage = goalAmount > 0 ? (raisedAmount / goalAmount) * 100 : 0;
  const displayPercentage = Math.min(100, Math.round(rawPercentage));

  return (
    <section
      className={`relative flex min-h-[100dvh] flex-col overflow-hidden md:min-h-0 md:justify-center md:py-24 ${
        bannerUrl ? "justify-end" : "justify-center"
      }`}
    >
      <div className="absolute inset-0">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset
          <img src={bannerUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-[linear-gradient(160deg,#8B1E1E_0%,#5c1414_100%)]">
            {/* A flat gradient reads as empty space at full-viewport height — this radial highlight gives the eye a focal point even with no photo. */}
            <div className="size-full bg-[radial-gradient(ellipse_60%_50%_at_50%_35%,rgba(212,175,55,0.18)_0%,transparent_70%)]" />
          </div>
        )}
        {bannerUrl && (
          <div className="absolute inset-0 bg-black/40" />
        )}
        {bannerUrl && (
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.25)_0%,rgba(0,0,0,0.45)_55%,rgba(0,0,0,0.8)_100%)]" />
        )}
      </div>

      <div
        className={`animate-in fade-in slide-in-from-bottom-4 relative z-10 mx-auto w-full max-w-lg px-5 pb-10 duration-700 md:px-6 ${
          bannerUrl ? "pt-24" : "pt-10"
        }`}
      >
        {!bannerUrl && (
          <div className="mb-6 flex justify-center">
            <TempleMonogram name={templeName} />
          </div>
        )}
        <p className="text-center text-xs font-medium tracking-[0.2em] text-white/80 uppercase">{templeName}</p>
        <h1 className="mt-3 text-center font-heading text-4xl leading-[1.1] text-white sm:text-5xl">{campaignTitle}</h1>
        <p className="mt-4 text-center text-base text-white/85">{subtitle}</p>

        {goalAmount > 0 && (
          <div className="mt-8 space-y-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <DonateProgress value={displayPercentage} />
            <div className="flex items-center justify-between text-sm text-white">
              <span className="font-semibold">{formatInr(raisedAmount)} raised</span>
              <span className="text-white/75">of {formatInr(goalAmount)} goal</span>
            </div>
            {donorCount > 0 && (
              <div className="flex items-center justify-center gap-1.5 border-t border-white/15 pt-3 text-sm text-white/90">
                <Users className="size-3.5" />
                {donorCount === 1 ? "1 devotee has contributed" : `${donorCount} devotees have contributed`}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button size="xl" className="bg-white text-[#8B1E1E] hover:bg-white/90 sm:flex-1" render={<a href="#donate" />}>
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

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/70">
          <ShieldCheck className="size-3.5" />
          Secure payments · Verified Temple
        </div>
      </div>
    </section>
  );
}
