import Image from "next/image";
import { Eye, HeartHandshake, ShieldCheck } from "lucide-react";
import { MotionStagger, MotionStaggerItem } from "@/components/motion-reveal";

const CARDS = [
  { icon: Eye, title: "Transparency", description: "Every donation is tracked against a real campaign goal, visible to everyone." },
  { icon: ShieldCheck, title: "Secure Donations", description: "You pay directly through your own trusted UPI app — TempleOS never touches your money." },
  { icon: HeartHandshake, title: "Blessings & Community", description: "Join thousands of devotees supporting this temple's sacred traditions." },
];

/** New, additive "Trust & Transparency" section — distinct from the existing functional DonateTrust checkmark row (providerKey-driven, kept as-is right after the form). This one is decorative/persuasive copy only. */
export function DonateTrustCards() {
  return (
    <section className="relative mx-auto max-w-[1040px] px-5 py-16 md:px-6">
      <Image
        src="/donate-golden-lotus.png"
        alt=""
        width={480}
        height={480}
        className="pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 opacity-[0.06] md:size-[420px]"
        aria-hidden="true"
      />

      <h2 className="relative text-center font-heading text-2xl text-[#2B2118] sm:text-3xl">Trust &amp; Transparency</h2>

      <MotionStagger className="relative mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {CARDS.map((card) => (
          <MotionStaggerItem key={card.title}>
            <div className="h-full rounded-[20px] border border-[#F3E7DA] bg-white p-6 text-center shadow-[0_12px_30px_rgba(62,39,35,0.06)]">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
                <card.icon className="size-5" />
              </div>
              <p className="mt-4 font-heading text-base text-[#2B2118]">{card.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#6B5B4F]">{card.description}</p>
            </div>
          </MotionStaggerItem>
        ))}
      </MotionStagger>
    </section>
  );
}
