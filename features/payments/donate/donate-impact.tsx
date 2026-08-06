import { formatInr } from "@/lib/currency";

const IMPACT_TIERS = [
  { amount: 101, label: "Feeds Prasadam" },
  { amount: 501, label: "Construction Materials" },
  { amount: 1001, label: "Supports Renovation" },
  { amount: 5001, label: "Sponsors Major Restoration" },
];

/** "Where will my money go" — static, informational only. Amount selection stays owned by the form's own preset pills below (see donate-impact.tsx not being wired to form state, per the redesign plan). */
export function DonateImpact() {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-lg px-5 py-14 duration-700 md:px-6">
      <h2 className="mb-6 text-center font-heading text-2xl text-[#2D2D2D]">Your Contribution Makes a Difference</h2>
      <div className="grid grid-cols-2 gap-3">
        {IMPACT_TIERS.map((tier) => (
          <div key={tier.amount} className="rounded-2xl bg-white p-4 text-center ring-1 ring-[#2D2D2D]/8">
            <p className="font-heading text-xl text-[#8B1E1E]">{formatInr(tier.amount)}</p>
            <p className="mt-1 text-sm text-[#2D2D2D]/75">{tier.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
