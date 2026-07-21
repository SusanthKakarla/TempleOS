"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatInr } from "@/lib/currency";
import { springSoft } from "@/lib/motion";
import { useCountUp } from "./use-count-up";

interface MetricCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  gradient: string;
  /**
   * Display format for the animated count. A function prop isn't usable here
   * (this is a Client Component fed from Server Component pages, and
   * functions can't cross that boundary), so this is a fixed literal instead.
   */
  format?: "number" | "currency" | "percent";
  /** Opt-in. Only rendered when passed — no trend is fabricated from a single point-in-time value. */
  trend?: { value: number; direction: "up" | "down" };
  /** Opt-in decorative sparkline. Purely ornamental, not a real chart. */
  sparkline?: number[];
  className?: string;
  /** Smaller icon chip + padding for dense grids (e.g. 6-up stat bars) where the default size crowds the card. */
  compact?: boolean;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 72;
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="text-current opacity-40"
      aria-hidden="true"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  gradient,
  format = "number",
  trend,
  sparkline,
  className,
  compact = false,
}: MetricCardProps) {
  const displayValue = useCountUp(value);
  const formatted =
    format === "currency" ? formatInr(displayValue) : format === "percent" ? `${displayValue}%` : displayValue;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={springSoft}
      className="h-full"
    >
      <Card
        className={cn(
          "glass-card group h-full gap-3 overflow-hidden rounded-2xl shadow-sm transition-shadow duration-300 hover:shadow-xl",
          compact ? "p-4" : "p-5",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl text-white shadow-lg ring-2 ring-background transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6",
              compact ? "size-8" : "size-10",
              gradient,
            )}
          >
            {icon}
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="font-heading text-3xl font-semibold tabular-nums">{formatted}</p>
          {sparkline && sparkline.length > 1 && <Sparkline values={sparkline} />}
        </div>
        {trend && (
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trend.direction === "up" ? "bg-emerald/15 text-emerald" : "bg-destructive/10 text-destructive",
            )}
          >
            {trend.direction === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </Card>
    </motion.div>
  );
}
