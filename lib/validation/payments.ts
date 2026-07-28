import { z } from "zod";

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
  donorPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid mobile number"),
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
