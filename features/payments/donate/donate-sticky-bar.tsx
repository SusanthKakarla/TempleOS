"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { formatInr } from "@/lib/currency";
import { Button } from "@/components/ui/button";

interface DonateStickyBarProps {
  raisedAmount: number;
  goalAmount: number;
  accent: string;
}

/**
 * Mobile-only sticky donate bar — most devotees arrive from a WhatsApp link
 * on a phone and scroll through the whole story, so the ask must stay
 * reachable without scrolling back up.
 *
 * Hidden until the hero's own Donate button has scrolled out of view, so the
 * two are never on screen competing at once, and hidden again once the form
 * itself is in view (donating to a form you are already looking at needs no
 * floating button). Desktop uses the sticky sidebar card instead, so this is
 * `lg:hidden`.
 */
export function DonateStickyBar({ raisedAmount, goalAmount, accent }: DonateStickyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heroButton = document.getElementById("hero-donate-button");
    const form = document.getElementById("donate");
    if (!heroButton || !form) return;

    let heroVisible = true;
    let formVisible = false;
    const update = () => setVisible(!heroVisible && !formVisible);

    const heroObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      update();
    });
    const formObserver = new IntersectionObserver(([entry]) => {
      formVisible = entry.isIntersecting;
      update();
    });

    heroObserver.observe(heroButton);
    formObserver.observe(form);
    return () => {
      heroObserver.disconnect();
      formObserver.disconnect();
    };
  }, []);

  const percentage = goalAmount > 0 ? Math.min(100, Math.round((raisedAmount / goalAmount) * 100)) : 0;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#F3E7DA] bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(62,39,35,0.12)] backdrop-blur-md transition-transform duration-300 lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      // Kept mounted (never conditionally removed) so the slide transition can
      // play both ways; hidden from AT and tab order while off-screen.
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#2B2118]">{formatInr(raisedAmount)} raised</p>
          {goalAmount > 0 && <p className="truncate text-xs text-[#8C7B6D]">{percentage}% of {formatInr(goalAmount)}</p>}
        </div>
        <Button size="lg" style={{ backgroundColor: accent }} className="shrink-0 text-white hover:opacity-90" render={<a href="#donate" />}>
          <Heart className="size-4" data-icon="inline-start" aria-hidden="true" />
          Donate
        </Button>
      </div>
    </div>
  );
}
