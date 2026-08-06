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

/**
 * Manual PhonePe connection — used both by the Super Admin route and the
 * tenant self-service route (the same "validate live before persisting"
 * posture as Razorpay's). PhonePe's current Standard Checkout v2 API is
 * OAuth client-credentials based (Client ID/Client Secret/Client Version),
 * NOT the older Salt Key/Salt Index checksum scheme — verified live against
 * developer.phonepe.com during this feature's build, so only the modern
 * fields are collected. `webhookSecret` is stored as a single
 * "username:password" string, matching the one field PhonePe's own "SHA
 * (Username & Password)" webhook auth mode needs (see
 * lib/payments/adapters/phonepe-adapter.ts's verifyWebhookSignature).
 */
export const manualConnectPhonepeSchema = z.object({
  merchantId: z.string().trim().min(1, "Merchant ID is required").max(100),
  clientId: z.string().trim().min(1, "Client ID is required").max(200),
  clientSecret: z.string().trim().min(1, "Client Secret is required"),
  environment: z.enum(["sandbox", "production"]),
  webhookSecret: z
    .string()
    .trim()
    .regex(/^[^:]+:.+$/, 'Enter the webhook username and password as "username:password"')
    .nullable()
    .optional(),
});

export type ManualConnectPhonepePayload = z.infer<typeof manualConnectPhonepeSchema>;

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
