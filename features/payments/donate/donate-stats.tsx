"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";

interface Stat {
  value: number;
  prefix?: string;
  suffix: string;
  label: string;
}

// Marketing figures for the temple as a whole, kept deliberately separate
// from this specific campaign's real raised/goal amounts already shown in
// the Campaign Card above — these are static, not a DB aggregate.
const STATS: Stat[] = [
  { value: 15000, suffix: "+", label: "Devotees" },
  { value: 2.5, prefix: "₹", suffix: "Cr+", label: "Donations Received" },
  { value: 365, suffix: "", label: "Daily Poojas" },
  { value: 50, suffix: "+", label: "Years of Service" },
];

function StatCounter({ stat }: { stat: Stat }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (value) =>
    Number.isInteger(stat.value) ? Math.round(value).toLocaleString("en-IN") : value.toFixed(1),
  );

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, stat.value, { duration: 1.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, stat.value, count]);

  return (
    <p ref={ref} className="font-heading text-3xl text-[#D4AF37] sm:text-4xl">
      {stat.prefix}
      <motion.span>{rounded}</motion.span>
      {stat.suffix}
    </p>
  );
}

/** New, purely presentational stats band — static marketing copy, no data fetching. */
export function DonateStats() {
  return (
    <section className="bg-[#FFF6ED] px-5 py-16 md:px-6">
      <div className="mx-auto grid max-w-[1040px] grid-cols-2 gap-8 text-center sm:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <StatCounter stat={stat} />
            <p className="mt-1 text-sm text-[#6B5B4F]">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
