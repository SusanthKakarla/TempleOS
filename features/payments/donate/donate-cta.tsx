import Image from "next/image";
import { Heart } from "lucide-react";
import { MotionReveal } from "@/components/motion-reveal";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/features/payments/share-button";
import type { DonationBlockedReason } from "@/lib/payments/donation-checkout-service";
import { cn } from "@/lib/utils";
import { DONATE_BUTTON_LABEL } from "./donate-button-copy";

interface DonateCtaProps {
  campaignTitle: string;
  shareUrl: string;
  canDonate: boolean;
  blockedReason: DonationBlockedReason | null;
}

/** New, full-width closing call-to-action — reuses the same #donate anchor and ShareButton the hero already uses, no duplicated share logic. */
export function DonateCta({ campaignTitle, shareUrl, canDonate, blockedReason }: DonateCtaProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#D4AF37] to-[#FF9933] px-5 py-16 text-center md:px-6">
      <Image
        src="/donate-golden-lotus.png"
        alt=""
        width={640}
        height={640}
        className="pointer-events-none absolute top-1/2 left-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 opacity-10 md:size-[560px]"
        aria-hidden="true"
      />

      <MotionReveal className="relative mx-auto max-w-xl">
        <h2 className="font-heading text-2xl text-white sm:text-3xl">Together We Preserve Our Sacred Heritage</h2>
        <p className="mt-3 text-sm text-white/90 sm:text-base">
          Every contribution, big or small, keeps our traditions alive for generations to come.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            size="xl"
            className={cn("text-[#2B2118]", canDonate ? "bg-white hover:bg-white/90" : "bg-white/70 hover:bg-white/80")}
            render={<a href="#donate" />}
          >
            <Heart className="size-4" data-icon="inline-start" aria-hidden="true" />
            {canDonate ? "Donate Now" : DONATE_BUTTON_LABEL[blockedReason!]}
          </Button>
          <ShareButton title={campaignTitle} url={shareUrl} size="xl" className="border-white/60 bg-transparent text-white hover:bg-white/10" />
        </div>
      </MotionReveal>
    </section>
  );
}
