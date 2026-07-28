import { z } from "zod";

/** Structural validation only ("never trust frontend") — a live Razorpay credential check is a separate, best-effort, non-blocking step (see lib/payments/payment-provider-service.ts::validateCredentials). */
export const connectRazorpayAccountSchema = z.object({
  providerKey: z.literal("razorpay"),
  keyId: z
    .string()
    .trim()
    .regex(/^rzp_(test|live)_[A-Za-z0-9]+$/, "Enter a valid Razorpay Key ID (rzp_test_... or rzp_live_...)"),
  keySecret: z.string().trim().min(1, "Key Secret is required"),
  webhookSecret: z.string().trim().min(1).nullable().optional(),
});

export type ConnectRazorpayAccountPayload = z.infer<typeof connectRazorpayAccountSchema>;

export const donationCheckoutSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero").max(1_000_000, "Amount is too large"),
  donorName: z.string().trim().min(1, "Name is required").max(200),
  donorPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number")
    .nullable()
    .optional(),
  donorEmail: z.string().trim().email("Enter a valid email").nullable().optional(),
  isAnonymous: z.boolean().default(false),
});

export type DonationCheckoutPayload = z.infer<typeof donationCheckoutSchema>;
