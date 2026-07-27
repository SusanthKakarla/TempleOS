import { Landmark, UserPlus, LayoutDashboard } from "lucide-react";
import {
  MotionStagger,
  MotionStaggerItem,
} from "@/components/motion-reveal";

/**
 * How It Works Section
 *
 * Three-step onboarding flow on a muted surface background.
 * Steps are connected by a subtle vertical line on mobile and
 * horizontal dotted connector on desktop, reinforcing sequence.
 * The numbering uses saffron to tie back to the brand accent.
 */

const steps = [
  {
    number: "01",
    icon: Landmark,
    title: "Register your temple",
    description:
      "Sign up and provide basic details about your temple. We will configure a dedicated, private workspace for your administration team.",
  },
  {
    number: "02",
    icon: UserPlus,
    title: "Add devotees and services",
    description:
      "Import or add devotee records, define your seva offerings, configure donation categories, and set up your event calendar.",
  },
  {
    number: "03",
    icon: LayoutDashboard,
    title: "Manage from one dashboard",
    description:
      "Everything lives in a single, intuitive dashboard. Track bookings, generate reports, send WhatsApp messages, and grow your community.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Simple Setup
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Up and running in three steps
          </h2>
        </div>

        <MotionStagger
          className="relative mt-16 grid gap-8 sm:gap-12 lg:grid-cols-3 lg:gap-8"
          staggerDelay={0.12}
        >
          {/* Horizontal connector line (desktop only) */}
          <div
            className="pointer-events-none absolute top-12 right-[calc(16.67%+1rem)] left-[calc(16.67%+1rem)] hidden h-px border-t border-dashed border-border lg:block"
            aria-hidden="true"
          />

          {steps.map((step) => (
            <MotionStaggerItem key={step.number}>
              <div className="relative flex flex-col items-center text-center">
                {/* Step number badge */}
                <div className="relative z-10 mb-5 flex size-14 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-border">
                  <step.icon
                    className="size-6 text-accent"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-accent text-[0.65rem] font-bold text-accent-foreground">
                    {step.number}
                  </span>
                </div>

                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}
