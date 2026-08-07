"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

/**
 * Animates the fill from 0 on mount to `value` — the only reason this needs
 * to be a client leaf; Progress's indicator already has `transition-all`,
 * this just gives it something to transition from. `accent` lets the
 * campaign theme colour the fill without every caller re-declaring these
 * arbitrary selector overrides.
 */
export function DonateProgress({ value, accent = "#D4AF37" }: { value: number; accent?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplayValue(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div
      className="[&_[data-slot=progress-indicator]]:bg-(--donate-accent) [&_[data-slot=progress-indicator]]:duration-1000 [&_[data-slot=progress-indicator]]:ease-out [&_[data-slot=progress-track]]:bg-[#F6E8DA]"
      style={{ "--donate-accent": accent } as React.CSSProperties}
    >
      <Progress value={displayValue} />
    </div>
  );
}
