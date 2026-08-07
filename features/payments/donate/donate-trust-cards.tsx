import Image from "next/image";
import { BadgeCheck, Eye, Lock, ShieldCheck } from "lucide-react";
import { MotionStagger, MotionStaggerItem } from "@/components/motion-reveal";
import type { PaymentProviderKey } from "@/types/db";

interface TrustCard {
  icon: typeof Eye;
  title: string;
  description: string;
}

/**
 * Trust & transparency, stated accurately for how the money actually moves.
 *
 * The "TempleOS never touches your money" claim used to be shown to every
 * visitor, but it is only true on the `upi_manual` flow, where the donor
 * pays the temple's own VPA directly. On a gateway (Razorpay/PhonePe) the
 * funds settle to the temple's connected merchant account through the
 * provider, so that card is replaced rather than reworded — an inaccurate
 * trust badge is worse than none on a page collecting payments.
 */
function buildCards(providerKey: PaymentProviderKey): TrustCard[] {
  const common: TrustCard[] = [
    {
      icon: Eye,
      title: "Transparency",
      description: "Every donation is tracked against this campaign's real goal, visible to everyone on this page.",
    },
    {
      icon: BadgeCheck,
      title: "Verified Temple",
      description: "This campaign was published by the temple's own administrators, managed on TempleOS.",
    },
  ];

  if (providerKey === "upi_manual") {
    return [
      ...common,
      {
        icon: ShieldCheck,
        title: "Paid Directly to the Temple",
        description: "You pay the temple's own UPI ID from your usual app — TempleOS never holds your money.",
      },
    ];
  }

  return [
    ...common,
    {
      icon: Lock,
      title: "Encrypted Payment",
      description: "Card and UPI details are entered on the payment provider's secure checkout, never on this page.",
    },
  ];
}

export function DonateTrustCards({ providerKey }: { providerKey: PaymentProviderKey }) {
  const cards = buildCards(providerKey);

  return (
    <section className="relative mx-auto max-w-[1040px] px-5 py-14 md:px-6 md:py-16">
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
        {cards.map((card) => (
          <MotionStaggerItem key={card.title}>
            <div className="h-full rounded-[20px] border border-[#F3E7DA] bg-white p-6 text-center shadow-[0_12px_30px_rgba(62,39,35,0.06)]">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
                <card.icon className="size-5" aria-hidden="true" />
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
