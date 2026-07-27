import { Landmark } from "lucide-react";
import { MotionReveal } from "@/components/motion-reveal";

/**
 * Social proof strip between hero and features.
 * Uses a warm muted tone with decorative temple icons as placeholder
 * for real temple logos once partnerships are established.
 */

const temples = [
  "Sri Venkateswara Temple",
  "Shri Ganesh Mandir",
  "Lakshmi Narasimha Temple",
  "Jagannath Temple Trust",
  "Sri Rama Devasthanam",
];

export function SocialProofBar() {
  return (
    <section className="border-b border-border bg-background py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <MotionReveal>
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Trusted by temples across India
          </p>
        </MotionReveal>
        <MotionReveal delay={0.15}>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {temples.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 text-sm text-muted-foreground/60"
              >
                <Landmark className="size-3.5" aria-hidden="true" />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
