import { z } from "zod";

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
