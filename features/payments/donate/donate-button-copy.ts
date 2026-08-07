import type { DonationBlockedReason } from "@/lib/payments/donation-checkout-service";

/**
 * Shared by DonateHero and DonateCta — both render a "Donate Now" button
 * that anchors to #donate regardless of campaign state (scrolling there
 * always shows either the live checkout form or DonationCheckoutForm's own
 * BLOCKED_COPY card explaining why donations are unavailable). This map only
 * swaps the button's own label so it doesn't read as a live "Donate Now" CTA
 * when it isn't one. Type-only import of DonationBlockedReason — zero
 * runtime coupling to the server-only donation-checkout-service module,
 * same pattern donation-checkout-form.tsx already uses.
 */
export const DONATE_BUTTON_LABEL: Record<DonationBlockedReason, string> = {
  not_started: "Opens Soon",
  expired: "Campaign Ended",
  disabled: "Not Accepting Donations",
  payment_not_configured: "Not Available",
  goal_reached: "Goal Reached 🎉",
};
