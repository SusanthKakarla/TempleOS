import { HardHat, Landmark, PaintRoller, UtensilsCrossed } from "lucide-react";
import { formatInr } from "@/lib/currency";

const IMPACT_TIERS = [
  { amount: 101, label: "Feeds Prasadam", icon: UtensilsCrossed },
  { amount: 501, label: "Temple Construction", icon: HardHat },
  { amount: 1001, label: "Supports Renovation", icon: PaintRoller },
  { amount: 5001, label: "Major Restoration", icon: Landmark },
];

/** "Where will my money go" — static, informational only. Amount selection stays owned by the form's own preset pills, not this section. */
export function DonateImpact() {
  return (
    <section className="animate-in fade-in duration-500 mx-auto max-w-lg px-5 py-10 md:px-6">
      <h2 className="mb-4 font-heading text-xl text-[#2B2B2B]">Your Contribution Makes a Difference</h2>
      <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:grid md:grid-cols-4 md:px-0">
        {IMPACT_TIERS.map((tier) => (
          <div
            key={tier.amount}
            className="flex w-36 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-[#E9E4DD] bg-white p-4 text-center shadow-sm md:w-auto"
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-[#C6922F]/12">
              <tier.icon className="size-4.5 text-[#8B4513]" aria-hidden="true" />
            </div>
            <p className="font-heading text-lg text-[#8B4513]">{formatInr(tier.amount)}</p>
            <p className="text-xs text-[#2B2B2B]/65">{tier.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
