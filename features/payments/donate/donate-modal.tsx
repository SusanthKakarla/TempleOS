"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatInr } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { DonationBlockedReason } from "@/lib/payments/donation-checkout-service";
import { DonationCheckoutForm } from "@/features/payments/donation-checkout-form";
import { DONATE_BUTTON_LABEL } from "./donate-button-copy";

interface DonateModalContextValue {
  open: () => void;
  canDonate: boolean;
  blockedReason: DonationBlockedReason | null;
}

const DonateModalContext = createContext<DonateModalContextValue | null>(null);

/**
 * Every "Donate" affordance on the campaign page — the hero card, the closing
 * CTA, the sticky mobile bar — opens this one dialog. Reading the opener from
 * context keeps those buttons from each owning a copy of the state, and means
 * there is still exactly ONE DonationCheckoutForm mounted on the page, so no
 * duplicate donation form or second checkout path is introduced.
 */
export function useDonateModal(): DonateModalContextValue {
  const context = useContext(DonateModalContext);
  if (!context) {
    throw new Error("useDonateModal must be used inside <DonateModalProvider>");
  }
  return context;
}

export interface DonateModalProviderProps {
  tenantSlug: string;
  campaignSlug: string;
  token: string;
  templeName: string;
  campaignTitle: string;
  upi: { vpa: string; payeeName: string; qrCodeUrl: string | null } | null;
  canDonate: boolean;
  blockedReason: DonationBlockedReason | null;
  raisedAmount: number;
  goalAmount: number;
  children: React.ReactNode;
}

export function DonateModalProvider({
  tenantSlug,
  campaignSlug,
  token,
  templeName,
  campaignTitle,
  upi,
  canDonate,
  blockedReason,
  raisedAmount,
  goalAmount,
  children,
}: DonateModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Starts hidden and is only ever turned on by the observer below, so the
  // bar never flashes over the hero on first paint (and setState never runs
  // straight from an effect body).
  const [stickyVisible, setStickyVisible] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);

  // The sticky mobile bar appears only once the hero's own Donate button has
  // scrolled away, so the page never shows two competing CTAs at once.
  useEffect(() => {
    const heroButton = document.getElementById("hero-donate-button");
    if (!heroButton) return;
    const observer = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), {
      rootMargin: "0px 0px -10% 0px",
    });
    observer.observe(heroButton);
    return () => observer.disconnect();
  }, []);

  // A devotee arriving on an old link with #donate in it (or from a WhatsApp
  // message that carried one) still lands on the form, now as the dialog.
  useEffect(() => {
    function openFromHash() {
      if (window.location.hash === "#donate") setIsOpen(true);
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  return (
    <DonateModalContext.Provider value={{ open, canDonate, blockedReason }}>
      {children}

      {/* Sticky mobile CTA — the page's, not the form's: the form now lives in
          a dialog, where a `fixed` bar of its own would float above the
          backdrop. */}
      <div
        className={cn(
          "fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-[#F3E7DA] bg-white/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur transition-all duration-300 md:hidden",
          stickyVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0",
        )}
        aria-hidden={!stickyVisible}
        inert={!stickyVisible}
      >
        {goalAmount > 0 && (
          <p className="px-2 pb-1 text-center text-xs font-medium text-[#8C7B6D]">
            {formatInr(raisedAmount)} raised of {formatInr(goalAmount)}
          </p>
        )}
        <Button
          size="xl"
          onClick={open}
          className={cn(
            "w-full gap-1.5 rounded-full text-white",
            canDonate ? "bg-[#D4AF37] hover:bg-[#C19A2E]" : "bg-[#8C7B6D] hover:bg-[#7A6B5E]",
          )}
        >
          <Heart className="size-4" aria-hidden="true" />
          {canDonate ? "Donate Now" : DONATE_BUTTON_LABEL[blockedReason!]}
        </Button>
      </div>
      <div className="h-24 md:hidden" aria-hidden="true" />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/*
          Wider than the default dialog and scrollable inside itself: the form
          is long (amount presets, donor fields, then the UPI handoff screen),
          and on a phone it has to be usable at 100dvh minus the browser
          chrome without the page behind it scrolling.
        */}
        <DialogContent className="max-h-[90dvh] w-full overflow-y-auto p-0 sm:max-w-lg">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle className="text-left font-heading text-lg text-[#2B2118]">{campaignTitle}</DialogTitle>
          </DialogHeader>
          <div className="p-3 sm:p-4">
            <DonationCheckoutForm
              tenantSlug={tenantSlug}
              campaignSlug={campaignSlug}
              token={token}
              templeName={templeName}
              upi={upi}
              canDonate={canDonate}
              blockedReason={blockedReason}
            />
          </div>
        </DialogContent>
      </Dialog>
    </DonateModalContext.Provider>
  );
}

/** The hero/CTA donate buttons render this so their label and disabled-ness track the campaign state from one place. */
export function DonateModalTrigger({ className, size = "xl" }: { className?: string; size?: "default" | "lg" | "xl" }) {
  const { open, canDonate, blockedReason } = useDonateModal();

  return (
    <Button size={size} onClick={open} className={className}>
      <Heart className="size-4" data-icon="inline-start" aria-hidden="true" />
      {canDonate ? "Donate Now" : DONATE_BUTTON_LABEL[blockedReason!]}
    </Button>
  );
}
