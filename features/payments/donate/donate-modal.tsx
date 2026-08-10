"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Heart, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  return (
    <DonateModalContext.Provider value={{ open, canDonate, blockedReason }}>
      {children}

      {/* Sticky mobile CTA — the page's, not the form's: the form now lives in
          a dialog, where a `fixed` bar of its own would float above the
          backdrop. Full-width, flush to the bottom edge, rounded top
          corners only — a docked bar, not a floating pill, so it never
          reads as visually disconnected from the page. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-[#E9DED0] bg-white/97 px-4 pt-3 shadow-[0_-8px_24px_rgba(47,33,27,0.1)] backdrop-blur transition-transform duration-300 md:hidden",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          stickyVisible ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
        aria-hidden={!stickyVisible}
        inert={!stickyVisible}
      >
        {goalAmount > 0 && (
          <p className="mb-2 text-center text-xs font-medium text-[#756A61]">
            {formatInr(raisedAmount)} raised · {formatInr(goalAmount)} goal
          </p>
        )}
        <Button
          size="xl"
          onClick={open}
          className={cn(
            "h-[52px] w-full gap-1.5 rounded-full text-base font-semibold text-white",
            canDonate ? "bg-[#D98200] hover:bg-[#E28700]" : "bg-[#756A61] hover:bg-[#7A6B5E]",
          )}
        >
          <Heart className="size-4" aria-hidden="true" />
          {canDonate ? "Donate Now" : DONATE_BUTTON_LABEL[blockedReason!]}
        </Button>
      </div>
      <div className="h-24 md:hidden" aria-hidden="true" />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/*
          One dialog, two shapes: a bottom sheet on mobile (flush to the
          viewport edges, rounded top corners only, capped at 90vh so the
          long form — amount presets, donor fields, the UPI handoff screen —
          scrolls inside itself) and a centered ~520px card from `sm` up.
        */}
        {/* The default close button sits at top-2 right-2 with an icon-sm
            (28px) hit area — too small for the 44px touch target this sheet
            needs, so `showCloseButton` is off and a larger one is rendered
            below at the same position. */}
        <DialogContent
          overlayClassName="bg-[rgba(47,33,27,0.45)] backdrop-blur-none"
          className={cn(
            "fixed inset-x-0 top-auto bottom-0 left-0 z-50 flex max-h-[92vh] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto rounded-t-[28px] rounded-b-none bg-[#FFFDF9] p-0 text-[#2F211B] shadow-[0_-8px_30px_rgba(47,33,27,0.12)]",
            "sm:inset-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[90vh] sm:max-w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px] sm:shadow-[0_20px_60px_rgba(47,33,27,0.18)]",
          )}
          showCloseButton={false}
        >
          {/* Drag handle — mobile bottom-sheet affordance only, hidden once the dialog becomes a centered desktop card. */}
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-[#D8CEC3]" />
          </div>

          <DialogClose
            render={
              <button
                type="button"
                aria-label="Close"
                className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-[#2F211B] transition-colors hover:bg-[#F3E7DA]"
              />
            }
          >
            <XIcon className="size-5" aria-hidden="true" />
          </DialogClose>

          <DialogHeader className="px-5 pt-3 pb-0">
            <DialogTitle className="text-left font-heading text-2xl leading-tight font-bold text-[#2F211B] sm:text-[26px]">
              Support this campaign
            </DialogTitle>
            <p className="text-[15px] text-[#756A61]">Choose your donation amount</p>
          </DialogHeader>
          <div className="px-5 pb-5">
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
