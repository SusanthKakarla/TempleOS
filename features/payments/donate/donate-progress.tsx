"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

/** Animates the fill from 0 on mount to `value` — the only reason this needs to be a client leaf; Progress's indicator already has `transition-all`, this just gives it something to transition from. */
export function DonateProgress({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplayValue(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="[&_[data-slot=progress-track]]:bg-[#E9E4DD] [&_[data-slot=progress-indicator]]:bg-[#C6922F] [&_[data-slot=progress-indicator]]:duration-1000 [&_[data-slot=progress-indicator]]:ease-out">
      <Progress value={displayValue} />
    </div>
  );
}
