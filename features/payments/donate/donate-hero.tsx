"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Heart } from "lucide-react";
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

interface DonateHeroProps {
  templeName: string;
  campaignTitle: string;
  subtitle: string;
  /** Already resolved through resolveCampaignHeroImage — the temple's banner, else the category image. Never empty. */
  heroImageUrl: string;
  /** True when heroImageUrl is the temple's own upload (an external ImageKit URL) rather than a bundled local asset. */
  heroImageIsUploaded: boolean;
  theme: CampaignTheme;
  raisedAmount: number;
  goalAmount: number;
  donorCount: number;
  daysLeft: number | null;
  shareUrl: string;
  /** False when the page renders but payment is currently blocked — the CTA keeps anchoring to #donate, it just stops claiming to be a live "Donate Now". */
  canDonate: boolean;
  blockedReason: DonationBlockedReason | null;
}

function TempleMonogram({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "T";
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-lg font-semibold text-[#D4AF37]">
      {initial}
    </div>
  );
}

/**
 * Hero — the temple's own uploaded campaign banner takes priority when set,
 * otherwise the campaign category's own artwork (resolved upstream so the
 * WhatsApp/OG preview uses the identical image). A category badge, accent
 * colour, and gradient scrim come from the campaign theme registry, so a
 * Renovation page and an Annadanam page are visibly different pages rather
 * than the same template with different words.
 *
 * The floating Campaign Card carries the real fundraising numbers — raised,
 * goal, percentage, supporters, days left — all live values, never a
 * marketing figure.
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
  const rawPercentage = goalAmount > 0 ? (raisedAmount / goalAmount) * 100 : 0;
  const displayPercentage = Math.min(100, Math.round(rawPercentage));
  const remaining = Math.max(0, goalAmount - raisedAmount);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

  return (
    <section>
      <div ref={heroRef} className="relative z-0 h-[70vh] max-h-[720px] min-h-[480px] w-full overflow-hidden rounded-b-[32px] shadow-lg">
        <motion.div style={{ y: parallaxY }} className="absolute inset-0 h-[120%]">
          {heroImageIsUploaded ? (
            // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset next/image is configured for
            <img src={heroImageUrl} alt="" className="size-full object-cover" />
          ) : (
            <Image src={heroImageUrl} alt="" fill priority sizes="100vw" className="object-cover" />
          )}
        </motion.div>

        {/* Category-tinted scrim over a neutral darkening base — keeps text legible on any uploaded banner while still reading as this campaign's colour. */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#3E2723]/60 via-[#3E2723]/35 to-[#3E2723]/85" aria-hidden="true" />
        <div className={`absolute inset-0 bg-gradient-to-tr ${theme.gradient} opacity-25 mix-blend-multiply`} aria-hidden="true" />

        <Image
          src="/donate-om-medallion.png"
          alt=""
          width={420}
          height={420}
          className="pointer-events-none absolute top-1/2 left-1/2 size-64 -translate-x-1/2 -translate-y-1/2 opacity-[0.07] md:size-96"
          aria-hidden="true"
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex h-full flex-col items-center justify-center px-5 text-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur-sm">
            <CampaignThemeIconGlyph icon={theme.icon} className="size-3.5" />
            {theme.label}
          </span>
          <p className="mt-4 text-xs font-medium tracking-[0.25em] text-[#FFF8E7]/80 uppercase">{templeName}</p>
          <h1 className="mt-3 max-w-2xl font-heading text-3xl leading-[1.15] text-white sm:text-4xl md:text-5xl">
            {campaignTitle}
          </h1>
          <p className="mt-4 max-w-md text-sm text-[#FFF8E7]/85 sm:text-base">{subtitle}</p>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/70 sm:bottom-28"
          aria-hidden="true"
        >
          <ChevronDown className="size-6" />
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto -mt-16 max-w-[760px] px-5 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[24px] border border-white/60 bg-white/90 p-6 shadow-[0_20px_60px_rgba(62,39,35,0.18)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <TempleMonogram name={templeName} />
            <p className="text-xs font-medium tracking-[0.1em] text-[#8C7B6D] uppercase">{templeName}</p>
          </div>

          <h2 className="mt-4 font-heading text-2xl leading-[1.25] text-[#2B2118] sm:text-3xl">{campaignTitle}</h2>

          <p className="mt-3 text-sm text-[#6B5B4F]">{subtitle}</p>

          {goalAmount > 0 && (
            <div className="mt-4 space-y-3">
              <DonateProgress value={displayPercentage} accent={theme.accent} />
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-[#2B2118]">{formatInr(raisedAmount)} raised</span>
                <span className="text-[#8C7B6D]">
                  {displayPercentage}% of {formatInr(goalAmount)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8C7B6D]">
                {donorCount > 0 && <span>{donorCount === 1 ? "1 supporter" : `${donorCount} supporters`}</span>}
                {remaining > 0 && <span>{formatInr(remaining)} to go</span>}
                {daysLeft !== null && <span>{daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}</span>}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button
              id="hero-donate-button"
              size="xl"
              style={canDonate ? { backgroundColor: theme.accent } : undefined}
              className={cn("flex-1 text-white hover:opacity-90", !canDonate && "bg-[#8C7B6D] hover:bg-[#7A6B5E]")}
              render={<a href="#donate" />}
            >
              <Heart className="size-4" data-icon="inline-start" aria-hidden="true" />
              {canDonate ? "Donate Now" : DONATE_BUTTON_LABEL[blockedReason!]}
            </Button>
            <div className="flex gap-3">
              <ShareButton
                title={campaignTitle}
                url={shareUrl}
                size="xl"
                className="flex-1 border-[#F3E7DA] text-[#2B2118] hover:bg-[#FFF6ED]"
              />
              <CopyLinkButton url={shareUrl} size="xl" className="flex-1 border-[#F3E7DA] text-[#2B2118] hover:bg-[#FFF6ED]" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
