import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionReveal } from "@/components/motion-reveal";

/**
 * Final CTA Section
 *
 * Dark midnight-blue panel with saffron accents, mirroring the hero
 * atmosphere. Creates a visual bookend that draws the eye down and
 * invites conversion. The radial gradient adds warm depth without
 * competing with the CTA button.
 */
export function CtaSection() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <MotionReveal>
          <div className="relative isolate overflow-hidden rounded-2xl bg-primary px-6 py-16 text-center sm:px-12 sm:py-20">
            {/* Warm atmospheric glow */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 60% 70% at 50% 100%, oklch(0.76 0.17 58 / 10%) 0%, transparent 60%),
                  radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.35 0.09 240 / 40%) 0%, transparent 70%)
                `,
              }}
              aria-hidden="true"
            />
            <div
              className="noise-overlay pointer-events-none absolute inset-0"
              aria-hidden="true"
            />

            <div className="relative">
              <h2 className="font-heading text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                Ready to digitize your temple?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-primary-foreground/70">
                Join the growing number of temples modernizing their operations
                while preserving their traditions. Get started with a free
                walkthrough of the platform.
              </p>
              <div className="mt-8">
                <Button
                  size="lg"
                  className="gradient-marigold h-11 px-8 text-sm font-semibold text-accent-foreground hover:brightness-110"
                  render={<Link href="/login" />}
                >
                  Request Early Access
                  <ArrowRight
                    className="size-4"
                    data-icon="inline-end"
                    aria-hidden="true"
                  />
                </Button>
              </div>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
