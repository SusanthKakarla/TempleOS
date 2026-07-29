import { z } from "zod";
import { normalizePhoneNumber } from "@/lib/phone.mts";

/** Super Admin manual-connect (Temples > [tenant] detail page). Structural validation only — the live Razorpay credential check is a separate, blocking step (see lib/payments/payment-provider-service.ts::validateCredentials), which must pass before this is ever persisted. */
export const superAdminConnectRazorpaySchema = z.object({
  keyId: z
    .string()
    .trim()
    .regex(/^rzp_(test|live)_[A-Za-z0-9]+$/, "Enter a valid Razorpay Key ID (rzp_test_... or rzp_live_...)"),
  keySecret: z.string().trim().min(1, "Key Secret is required"),
  webhookSecret: z.string().trim().min(1).nullable().optional(),
});

export type SuperAdminConnectRazorpayPayload = z.infer<typeof superAdminConnectRazorpaySchema>;

export const donationCheckoutSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero").max(1_000_000, "Amount is too large"),
  donorName: z.string().trim().min(1, "Name is required").max(200),
  // Normalized to full E.164 (defaulting to India for a bare 10-digit
  // number, matching normalizePhoneNumber's use everywhere else in this
  // app) — stored and sent-to-Meta consistently with whatsapp_messages'
  // own from_phone format. Without this, a donor's raw "8464091436" would
  // never match their actual conversation history ("+918464091436"),
  // making the 24h-conversation-window check always miss even when a
  // recent inbound message genuinely exists.
  donorPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid mobile number")
    .transform((value, ctx) => {
      const normalized = normalizePhoneNumber(value);
      if (!normalized) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid mobile number" });
        return z.NEVER;
      }
      return normalized;
    }),
  donorEmail: z.string().trim().email("Enter a valid email").nullable().optional(),
  donorPan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN (e.g. AAAAA9999A)")
    .nullable()
    .optional(),
  donationMessage: z.string().trim().max(500, "Message is too long").nullable().optional(),
  isAnonymous: z.boolean().default(false),
});

export type DonationCheckoutPayload = z.infer<typeof donationCheckoutSchema>;
