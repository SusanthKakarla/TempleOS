import { z } from "zod";

const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Must be a valid date/time",
});

const nullableTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const paymentMethodSchema = z.enum(["cash", "upi", "bank_transfer", "cheque", "other"]);

export const createDonationSchema = z.object({
  devoteeId: z.string().uuid("Select a devotee"),
  amount: z.number().positive("Amount must be greater than zero"),
  purpose: z.string().trim().min(1, "Purpose is required").max(200),
  paymentMethod: paymentMethodSchema,
  notes: nullableTrimmedString,
  donatedAt: isoDateTime,
});

export const updateDonationSchema = z.object({
  devoteeId: z.string().uuid("Select a devotee").optional(),
  amount: z.number().positive("Amount must be greater than zero").optional(),
  purpose: z.string().trim().min(1, "Purpose is required").max(200).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  notes: nullableTrimmedString,
  donatedAt: isoDateTime.optional(),
});

export type CreateDonationPayload = z.infer<typeof createDonationSchema>;
export type UpdateDonationPayload = z.infer<typeof updateDonationSchema>;
