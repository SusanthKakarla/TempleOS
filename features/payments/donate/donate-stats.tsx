"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { formatInr } from "@/lib/currency";

interface DonateStatsProps {
  raisedAmount: number;
  goalAmount: number;
  donorCount: number;
  daysLeft: number | null;
  /** ISO timestamp of the most recent donation to this campaign, or null when there are none yet. */
  lastDonationAt: string | null;
  accent: string;
}

function AnimatedNumber({ value, format }: { value: number; format: (value: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const count = useMotionValue(0);
  const text = useTransform(count, (current) => format(current));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, value, count]);

  return (
    <span ref={ref}>
      <motion.span>{text}</motion.span>
    </span>
  );
}

/** "2 hours ago" / "3 days ago" — coarse on purpose; an exact timestamp on a donation is more precision than a public page should publish. */
function formatRelative(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diffMs) || diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "yesterday" : `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}

/**
 * The campaign's real fundraising numbers.
 *
 * This band previously showed four *invented* marketing figures — "15,000+
 * Devotees", "₹2.5Cr+ Donations Received", "365 Daily Poojas", "50+ Years of
 * Service" — identical on every temple's page, on a page asking devotees for
 * money. Every number here now comes from this campaign's own donation
 * aggregate.
 */
export function DonateStats({ raisedAmount, goalAmount, donorCount, daysLeft, lastDonationAt, accent }: DonateStatsProps) {
  const percentage = goalAmount > 0 ? Math.min(100, Math.round((raisedAmount / goalAmount) * 100)) : 0;

  const stats: { label: string; node: React.ReactNode }[] = [
    { label: "Raised so far", node: <AnimatedNumber value={raisedAmount} format={(v) => formatInr(Math.round(v))} /> },
    { label: donorCount === 1 ? "Supporter" : "Supporters", node: <AnimatedNumber value={donorCount} format={(v) => Math.round(v).toLocaleString("en-IN")} /> },
  ];

  if (goalAmount > 0) {
    stats.push({ label: "Of the goal", node: <AnimatedNumber value={percentage} format={(v) => `${Math.round(v)}%`} /> });
  }
  if (daysLeft !== null) {
    stats.push({ label: daysLeft === 1 ? "Day left" : "Days left", node: <AnimatedNumber value={daysLeft} format={(v) => String(Math.round(v))} /> });
  }

  return (
    <section className="bg-[#FFF6ED] px-5 py-14 md:px-6 md:py-16">
      <div className="mx-auto max-w-[1040px]">
        <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-heading text-3xl sm:text-4xl" style={{ color: accent }}>
                {stat.node}
              </p>
              <p className="mt-1 text-sm text-[#6B5B4F]">{stat.label}</p>
            </div>
          ))}
        </div>
        {lastDonationAt && (
          <p className="mt-8 text-center text-xs text-[#8C7B6D]">Last donation received {formatRelative(lastDonationAt)}</p>
        )}
      </div>
    </section>
  );
}
