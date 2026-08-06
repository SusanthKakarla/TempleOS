import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { MotionStagger, MotionStaggerItem } from "@/components/motion-reveal";

const ITEMS = [
  "Daily Pooja",
  "Abhishekam",
  "Archana",
  "Deepa Aradhana",
  "Temple Festivals",
  "Annadanam",
  "Cow Protection",
  "Priest Services",
];

/** New, purely presentational section — no data fetching, static copy per the redesign brief. */
export function DonateContributionSupports() {
  return (
    <section id="contribution-supports" className="mx-auto max-w-[1040px] px-5 py-16 md:px-6">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[280px_1fr] md:items-center">
        <div className="relative mx-auto w-full max-w-[280px] md:order-1">
          <Image
            src="/donate-puja-plate.png"
            alt="Puja plate with offerings"
            width={560}
            height={560}
            className="w-full rounded-[24px] object-cover shadow-[0_20px_50px_rgba(62,39,35,0.15)]"
          />
        </div>

        <div className="md:order-2">
          <h2 className="font-heading text-2xl text-[#2B2118] sm:text-3xl">Your Contribution Supports</h2>
          <MotionStagger className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ITEMS.map((item) => (
              <MotionStaggerItem key={item}>
                <div className="flex items-center gap-2.5 rounded-[14px] border border-[#F3E7DA] bg-white px-4 py-3 text-sm text-[#2B2118]">
                  <CheckCircle2 className="size-4 shrink-0 text-[#D4AF37]" />
                  {item}
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </div>
    </section>
  );
}
