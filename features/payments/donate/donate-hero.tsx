"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Heart } from "lucide-react";
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
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-lg font-semibold text-[#D4AF37]">
      {initial}
    </div>
  );
}

/**
 * Hero — the temple's own uploaded campaign banner takes priority when set
 * (rendered as a plain `<img>`, external ImageKit URL); otherwise a large
 * immersive background built from the temple photo asset
 * (public/donate-hero-temple.png) with a subtle scroll parallax, dark
 * gradient overlay for text legibility, and a low-opacity Om medallion
 * watermark. The floating Campaign Card below carries all the real data
 * (progress/raised/goal/donate) exactly as before — same `id`s, same anchor
 * — only its visual chrome changed to a glassmorphism card overlapping the
 * hero's bottom edge.
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

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

  return (
    <section>
      <div ref={heroRef} className="relative z-0 h-[70vh] min-h-[480px] max-h-[720px] w-full overflow-hidden rounded-b-[32px] shadow-lg">
        <motion.div style={{ y: parallaxY }} className="absolute inset-0 h-[120%]">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset next/image isn't configured for
            <img src={bannerUrl} alt="" className="size-full object-cover" />
          ) : (
            <Image src="/donate-hero-temple.png" alt="" fill priority className="object-cover" />
          )}
        </motion.div>

        {/* Dark gradient overlay for text legibility, deepening toward the bottom where the floating card overlaps. */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#3E2723]/60 via-[#3E2723]/35 to-[#3E2723]/85" aria-hidden="true" />

        {/* Om medallion watermark — decorative only, kept subtle. */}
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
          <p className="text-xs font-medium tracking-[0.25em] text-[#FFF8E7]/80 uppercase">{templeName}</p>
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
              <DonateProgress value={displayPercentage} />
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#2B2118]">{formatInr(raisedAmount)} raised</span>
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
              className="flex-1 bg-[#D4AF37] text-white hover:bg-[#C19A2E]"
              render={<a href="#donate" />}
            >
              <Heart className="size-4" data-icon="inline-start" aria-hidden="true" />
              Donate Now
            </Button>
            <ShareButton title={campaignTitle} url={shareUrl} size="xl" className="border-[#F3E7DA] text-[#2B2118] hover:bg-[#FFF6ED]" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
