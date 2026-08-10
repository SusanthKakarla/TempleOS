"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DonationBlockedReason } from "@/lib/payments/donation-checkout-service";
import { DONATE_BUTTON_LABEL } from "./donate-button-copy";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/currency";
import type { CampaignTheme } from "@/lib/campaigns/campaign-theme";
import { ShareButton } from "@/features/payments/share-button";
import { CopyLinkButton } from "@/features/payments/donate/copy-link-button";
import { CampaignThemeIconGlyph } from "./campaign-theme-icon";
import { DonateProgress } from "./donate-progress";
import { useDonateModal } from "./donate-modal";

interface DonateHeroProps {
  templeName: string;
  campaignTitle: string;
  subtitle: string;
  heroImageUrl: string;
  heroImageIsUploaded: boolean;
  theme: CampaignTheme;
  raisedAmount: number;
  goalAmount: number;
  donorCount: number;
  daysLeft: number | null;
  shareUrl: string;
  canDonate: boolean;
  blockedReason: DonationBlockedReason | null;
}

/**
 * Compact hero (≈340–380px, not a near-full-screen banner) carrying the
 * campaign's identity exactly once: category pill, temple name, title,
 * short description, all set directly over the image. The Campaign Summary
 * card below is deliberately NOT a second copy of this — it shows only the
 * numbers (raised/goal/progress/days-left) and the Donate/Share actions, so
 * a devotee never reads the same title and description twice.
 */
export function DonateHero({
  templeName,
  campaignTitle,
  subtitle,
  heroImageUrl,
  heroImageIsUploaded,
  theme,
  raisedAmount,
  goalAmount,
  donorCount,
  daysLeft,
  shareUrl,
  canDonate,
  blockedReason,
}: DonateHeroProps) {
  const { open: openDonate } = useDonateModal();
  const rawPercentage = goalAmount > 0 ? (raisedAmount / goalAmount) * 100 : 0;
  const displayPercentage = Math.min(100, Math.round(rawPercentage));
  const remaining = Math.max(0, goalAmount - raisedAmount);
  const donateLabel = canDonate ? "Donate Now" : DONATE_BUTTON_LABEL[blockedReason!];

  return (
    <div>
      <div className="relative h-[340px] w-full overflow-hidden rounded-b-[28px] sm:h-[380px]">
        {heroImageIsUploaded ? (
          // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset next/image is configured for
          <img src={heroImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <Image src={heroImageUrl} alt="" fill priority sizes="100vw" className="object-cover" />
        )}

        {/* Overlay only where needed for legibility — deepest at the bottom, where the text sits. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" aria-hidden="true" />
        <div className={`absolute inset-0 bg-gradient-to-tr ${theme.gradient} opacity-20 mix-blend-multiply`} aria-hidden="true" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-5 pb-6 sm:px-6 sm:pb-8">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur-sm">
            <CampaignThemeIconGlyph icon={theme.icon} className="size-3.5" />
            {theme.label}
          </span>
          <p className="text-[11px] font-medium tracking-[0.2em] text-white/80 uppercase sm:text-xs">{templeName}</p>
          <h1 className="font-heading text-[30px] leading-[1.15] font-bold text-white sm:text-4xl">{campaignTitle}</h1>
          <p className="line-clamp-2 max-w-lg text-base text-white/90 sm:text-lg">{subtitle}</p>
        </div>
      </div>

      {/* Campaign Summary — numbers and actions only, never the title/description again. */}
      <div className="relative z-10 mx-auto -mt-8 max-w-[640px] px-5 sm:px-6">
        <div className="rounded-[24px] border border-[#E9DED0] bg-white p-5 shadow-[0_8px_28px_rgba(47,33,27,0.08)] sm:p-6">
          {goalAmount > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold text-[#2F211B]">{formatInr(raisedAmount)} raised</span>
                <span className="text-sm font-medium text-[#D98200]">{displayPercentage}%</span>
              </div>
              <DonateProgress value={displayPercentage} />
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[#756A61]">
                <span>{formatInr(goalAmount)} goal</span>
                <span className="flex items-center gap-3">
                  {donorCount > 0 && <span>{donorCount === 1 ? "1 supporter" : `${donorCount} supporters`}</span>}
                  {daysLeft !== null && <span>{daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}</span>}
                </span>
              </div>
              {remaining > 0 && rawPercentage < 100 && (
                <p className="text-xs text-[#756A61]">{formatInr(remaining)} to go</p>
              )}
            </div>
          )}

          <div className={cn("flex gap-3", goalAmount > 0 && "mt-5")}>
            <Button
              id="hero-donate-button"
              size="xl"
              onClick={openDonate}
              className={cn(
                "h-[52px] flex-1 gap-1.5 rounded-full text-base font-semibold text-white",
                canDonate ? "bg-[#D98200] hover:bg-[#E28700]" : "bg-[#756A61] hover:bg-[#7A6B5E]",
              )}
            >
              <Heart className="size-4" data-icon="inline-start" aria-hidden="true" />
              {donateLabel}
            </Button>
            <ShareButton
              title={campaignTitle}
              url={shareUrl}
              size="xl"
              className="h-[52px] shrink-0 rounded-full border-[#E9DED0] px-3 text-[#2F211B] hover:bg-[#FFF8E8]"
            />
            <CopyLinkButton url={shareUrl} size="xl" className="h-[52px] hidden shrink-0 rounded-full border-[#E9DED0] px-3 text-[#2F211B] hover:bg-[#FFF8E8] sm:inline-flex" />
          </div>
        </div>
      </div>
    </div>
  );
}
