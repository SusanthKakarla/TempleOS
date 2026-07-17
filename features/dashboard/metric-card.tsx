"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCountUp } from "./use-count-up";

interface MetricCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  gradient: string;
}

export function MetricCard({ label, value, icon, gradient }: MetricCardProps) {
  const displayValue = useCountUp(value);

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
        <p className="font-heading text-3xl font-semibold tabular-nums">{displayValue}</p>
      </Card>
    </motion.div>
  );
}
