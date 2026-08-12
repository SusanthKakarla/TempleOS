"use client";

import { useEffect, useRef } from "react";

/**
 * Slow parallax on the hero's blurred backdrop.
 *
 * Ported from the reference site. Written against a ref and a single style
 * write inside a rAF frame rather than React state: scroll fires far too
 * often to re-render on. Does nothing at all under `prefers-reduced-motion`.
 */
export function HeroParallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Drifts at a fraction of page speed, and stops once the hero has
        // scrolled away so it never fights content further down.
        const offset = Math.min(window.scrollY, node.offsetHeight) * 0.28;
        node.style.transform = `translate3d(0, ${offset}px, 0) scale(1.08)`;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 will-change-transform">
      {children}
    </div>
  );
}

const EMBERS = [
  { left: "8%", delay: "0s", duration: "13s", size: 4 },
  { left: "22%", delay: "2.4s", duration: "16s", size: 3 },
  { left: "37%", delay: "5.1s", duration: "12s", size: 5 },
  { left: "54%", delay: "1.2s", duration: "17s", size: 3 },
  { left: "69%", delay: "3.8s", duration: "14s", size: 4 },
  { left: "83%", delay: "6.3s", duration: "15s", size: 3 },
  { left: "94%", delay: "4.5s", duration: "18s", size: 4 },
];

/**
 * Drifting embers, as from a lamp or camphor flame. Purely decorative:
 * `aria-hidden`, and the whole layer is removed under reduced-motion by the
 * `motion-reduce:hidden` utility rather than by running an animation nobody
 * should see.
 */
export function Embers({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden="true">
      {EMBERS.map((ember) => (
        <span
          key={ember.left}
          className="site-ember absolute bottom-0 rounded-full"
          style={{
            left: ember.left,
            width: ember.size,
            height: ember.size,
            background: accent,
            animationDelay: ember.delay,
            animationDuration: ember.duration,
          }}
        />
      ))}
    </div>
  );
}
