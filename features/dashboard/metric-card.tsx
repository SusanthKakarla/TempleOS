"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatInr } from "@/lib/currency";
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
}

export function MetricCard({ label, value, icon, gradient, format = "number" }: MetricCardProps) {
  const displayValue = useCountUp(value);
  const formatted =
    format === "currency" ? formatInr(displayValue) : format === "percent" ? `${displayValue}%` : displayValue;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Card className="gap-3 overflow-hidden p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
              gradient,
            )}
          >
            {icon}
          </span>
        </div>
        <p className="font-heading text-3xl font-semibold tabular-nums">{formatted}</p>
      </Card>
    </motion.div>
  );
}
