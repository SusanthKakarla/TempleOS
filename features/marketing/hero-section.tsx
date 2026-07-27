import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroAnimations } from "./hero-animations";

/**
 * Hero Section
 *
 * Deep midnight-blue atmosphere with a warm saffron accent.
 * The mandala SVG is pure CSS/SVG art -- no external images.
 * Typography: Playfair Display for the headline, Noto Sans for body.
 */
export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-primary">
      {/* Atmospheric gradient layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.35 0.09 240 / 60%) 0%, transparent 70%),
            radial-gradient(ellipse 50% 80% at 80% 100%, oklch(0.76 0.17 58 / 12%) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 10% 80%, oklch(0.76 0.17 58 / 8%) 0%, transparent 50%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Subtle noise texture for analog depth */}
      <div className="noise-overlay pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Decorative mandala - positioned behind content */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <svg
          viewBox="0 0 400 400"
          className="size-[500px] opacity-[0.04] sm:size-[600px] lg:size-[700px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          style={{ color: "oklch(0.76 0.17 58)" }}
        >
          {/* Concentric circles */}
          <circle cx="200" cy="200" r="40" />
          <circle cx="200" cy="200" r="70" />
          <circle cx="200" cy="200" r="100" />
          <circle cx="200" cy="200" r="130" />
          <circle cx="200" cy="200" r="160" />
          <circle cx="200" cy="200" r="190" />
          {/* Radiating lines */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16;
            const rad = (angle * Math.PI) / 180;
            const x1 = 200 + 40 * Math.cos(rad);
            const y1 = 200 + 40 * Math.sin(rad);
            const x2 = 200 + 190 * Math.cos(rad);
            const y2 = 200 + 190 * Math.sin(rad);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
          {/* Petal arcs */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 360) / 8;
            const rad = (angle * Math.PI) / 180;
            const cx = 200 + 100 * Math.cos(rad);
            const cy = 200 + 100 * Math.sin(rad);
            return <circle key={`petal-${i}`} cx={cx} cy={cy} r="30" />;
          })}
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <HeroAnimations>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-accent">
              Temple Management Platform
            </p>
            <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
              The Digital Heart of{" "}
              <span className="text-accent">Your Temple</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/70 sm:text-lg">
              A complete platform for managing devotees, seva bookings, donations,
              events, and WhatsApp communication -- built for temples that serve
              their communities with devotion.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                size="lg"
                className="gradient-marigold h-11 px-6 text-sm font-semibold text-accent-foreground hover:brightness-110"
                render={<Link href="/login" />}
              >
                Request a Demo
                <ArrowRight className="size-4" data-icon="inline-end" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-11 border-primary-foreground/20 bg-transparent px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                render={<a href="#features" />}
              >
                See Features
              </Button>
            </div>
          </div>
        </HeroAnimations>
      </div>

      {/* Bottom fade into the next section */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          background: "linear-gradient(to top, var(--background), transparent)",
        }}
        aria-hidden="true"
      />
    </section>
  );
}
