"use client";

import { useEffect, useRef } from "react";

/**
 * Slow parallax on the hero's blurred backdrop.
 *
 * Written against a ref and a single style write inside a rAF frame rather
 * than React state: scroll fires far too often to re-render on. Does nothing
 * at all under `prefers-reduced-motion`.
 *
 * `depth` scales how far this layer drifts, so several layers sharing one
 * scroll listener separate from each other as the page moves — the backdrop
 * lags furthest, the architecture less, the deity barely at all.
 */
export function HeroParallax({
  children,
  depth = 0.28,
  scale = 1.08,
}: {
  children: React.ReactNode;
  depth?: number;
  scale?: number;
}) {
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
        const offset = Math.min(window.scrollY, node.offsetHeight) * depth;
        node.style.transform = `translate3d(0, ${offset}px, 0) scale(${scale})`;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [depth, scale]);

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

/**
 * A gopuram silhouette, drawn rather than photographed.
 *
 * A temple hero needs to read as a temple even when the tenant has uploaded
 * nothing but a deity portrait. Pulling a stock temple photo would put another
 * temple's architecture under this temple's name, so the environment is drawn
 * from the temple's own accent colour instead: a stepped gopuram flanked by
 * pillars, in flat silhouette at low opacity, sitting behind everything.
 *
 * Pure SVG — no image request, no layout shift, and it scales to any width.
 */
export function TempleSilhouette({ color }: { color: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] w-full"
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMax meet"
      fill="none"
      aria-hidden="true"
    >
      <g fill={color}>
        {/* Central gopuram: five receding tiers, each narrower than the last. */}
        <path d="M600 20 L636 62 H564 Z" opacity="0.5" />
        <rect x="556" y="62" width="88" height="34" rx="3" opacity="0.42" />
        <path d="M548 96 H652 L664 134 H536 Z" opacity="0.46" />
        <path d="M532 134 H668 L682 178 H518 Z" opacity="0.5" />
        <path d="M514 178 H686 L702 228 H498 Z" opacity="0.54" />
        <path d="M494 228 H706 L724 286 H476 Z" opacity="0.58" />
        <rect x="476" y="286" width="248" height="114" opacity="0.62" />
        {/* Sanctum doorway, cut as a rounded arch. */}
        <path d="M566 400 V330 a34 34 0 0 1 68 0 V400 Z" fill="#000" opacity="0.28" />

        {/* Flanking colonnades, stepping down and away from the tower. */}
        <rect x="300" y="300" width="164" height="100" opacity="0.4" />
        <rect x="736" y="300" width="164" height="100" opacity="0.4" />
        <path d="M300 300 H464 L448 268 H316 Z" opacity="0.36" />
        <path d="M736 300 H900 L884 268 H752 Z" opacity="0.36" />
        {[318, 366, 414, 754, 802, 850].map((x) => (
          <rect key={x} x={x} y="316" width="18" height="84" opacity="0.24" />
        ))}

        {/* Outer walls, faintest, to carry the silhouette to both edges. */}
        <rect x="60" y="344" width="228" height="56" opacity="0.26" />
        <rect x="912" y="344" width="228" height="56" opacity="0.26" />
      </g>
    </svg>
  );
}

/**
 * Slow light rays fanning from above the sanctum, as through temple smoke.
 * Four conic wedges at different opacities and drift speeds; removed entirely
 * under reduced motion.
 */
export function LightRays({ color }: { color: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-2/3 overflow-hidden motion-reduce:hidden"
      aria-hidden="true"
    >
      {[
        { left: "34%", rotate: -14, width: 90, delay: "0s", duration: "11s" },
        { left: "47%", rotate: -4, width: 140, delay: "2.5s", duration: "14s" },
        { left: "58%", rotate: 7, width: 110, delay: "1.2s", duration: "12.5s" },
        { left: "68%", rotate: 16, width: 70, delay: "3.6s", duration: "15s" },
      ].map((ray) => (
        <span
          key={ray.left}
          className="site-ray absolute -top-24 origin-top"
          style={{
            left: ray.left,
            width: ray.width,
            height: "150%",
            transform: `rotate(${ray.rotate}deg)`,
            background: `linear-gradient(to bottom, ${color}, transparent 72%)`,
            animationDelay: ray.delay,
            animationDuration: ray.duration,
          }}
        />
      ))}
    </div>
  );
}

/**
 * A slowly rotating mandala ring behind the deity. Drawn, not uploaded, for
 * the same reason as the silhouette: it belongs to no temple in particular.
 */
export function Mandala({ color, className = "" }: { color: string; className?: string }) {
  const petals = Array.from({ length: 24 }, (_, index) => index * 15);

  return (
    <svg
      className={`site-spin pointer-events-none ${className}`}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="76" stroke={color} strokeWidth="0.6" opacity="0.5" />
      <circle cx="100" cy="100" r="92" stroke={color} strokeWidth="0.4" opacity="0.3" strokeDasharray="2 7" />
      {petals.map((angle) => (
        <ellipse
          key={angle}
          cx="100"
          cy="24"
          rx="3.5"
          ry="11"
          fill={color}
          opacity="0.28"
          transform={`rotate(${angle} 100 100)`}
        />
      ))}
    </svg>
  );
}
