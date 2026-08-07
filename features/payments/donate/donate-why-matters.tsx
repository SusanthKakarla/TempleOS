import Image from "next/image";
import { Building2, Flame, HandHeart, PartyPopper } from "lucide-react";
import { MotionStagger, MotionStaggerItem } from "@/components/motion-reveal";

const REASONS = [
  { icon: Building2, title: "Temple Renovation", description: "Restoring and strengthening the temple structure for generations to come." },
  { icon: Flame, title: "Daily Maintenance", description: "Upkeep of the sanctum, lighting, and daily rituals that never pause." },
  { icon: HandHeart, title: "Annadanam", description: "Free meals served to devotees and the needy as an act of selfless service." },
  { icon: PartyPopper, title: "Festival Celebrations", description: "Vibrant festivals and processions that bring the community together." },
];

/** New, purely presentational section — no data fetching, static copy per the redesign brief. */
export function DonateWhyMatters() {
  return (
    <section id="why-donation-matters" className="bg-[#FFFDF5] px-5 py-16 md:px-6">
      <div className="mx-auto max-w-[1040px]">
        <h2 className="text-center font-heading text-2xl text-[#451A03] sm:text-3xl">Why Your Donation Matters</h2>

        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-[280px_1fr] md:items-center">
          <div className="relative mx-auto w-full max-w-[280px]">
            <Image
              src="/donate-temple-hundi.png"
              alt="Temple donation hundi"
              width={560}
              height={560}
              className="w-full rounded-[24px] object-cover shadow-[0_20px_50px_rgba(62,39,35,0.15)]"
            />
          </div>

          <MotionStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {REASONS.map((reason) => (
              <MotionStaggerItem key={reason.title}>
                <div className="group h-full rounded-xl border border-amber-100 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-sm">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-[#D97706]/10 text-[#D97706]">
                    <reason.icon className="size-5" />
                  </div>
                  <p className="mt-3 font-heading text-base text-[#451A03]">{reason.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#451A03]/70">{reason.description}</p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </div>
    </section>
  );
}
