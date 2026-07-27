import {
  Users,
  CalendarDays,
  IndianRupee,
  Star,
  MessageCircle,
  Globe,
} from "lucide-react";
import {
  MotionStagger,
  MotionStaggerItem,
} from "@/components/motion-reveal";

/**
 * Features Section
 *
 * 6 capabilities in a responsive grid. Each card uses a subtle surface treatment
 * with the saffron accent reserved exclusively for the icon, establishing
 * visual hierarchy without competing color noise.
 */

const features = [
  {
    icon: Users,
    title: "Devotee Management",
    description:
      "Maintain detailed profiles for every devotee and their family. Track seva history, preferences, and participation across all temple activities.",
  },
  {
    icon: CalendarDays,
    title: "Seva Bookings",
    description:
      "Let devotees schedule ritual services with a streamlined booking system. Manage priest assignments, time slots, and capacity with ease.",
  },
  {
    icon: IndianRupee,
    title: "Donations & Receipts",
    description:
      "Track every contribution with transparent accounting. Generate tax-compliant receipts and gain insight through donation analytics.",
  },
  {
    icon: Star,
    title: "Events Management",
    description:
      "Create, schedule, and publish temple events. From daily pujas to annual festivals, manage the full lifecycle in one place.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Communication",
    description:
      "Reach devotees where they already are. Send automated reminders, event announcements, and booking confirmations via WhatsApp Business.",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description:
      "Serve your community in their mother tongue. Full English and Telugu support built in, with a framework ready for more languages.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-16 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Everything You Need
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            One platform, every temple need
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Purpose-built tools for the unique workflows of Hindu temple
            administration. No more spreadsheets, no more lost records.
          </p>
        </div>

        <MotionStagger
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.08}
        >
          {features.map((feature) => (
            <MotionStaggerItem key={feature.title}>
              <article className="surface-card group rounded-xl p-6 transition-shadow duration-300 hover:shadow-md">
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-accent/10">
                  <feature.icon
                    className="size-5 text-accent"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}
