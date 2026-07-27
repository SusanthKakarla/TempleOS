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

/** A donor with no devotee record — see migrations/024_donation_manual_donor.sql. */
export const manualDonorSchema = z.object({
  name: z.string().trim().min(1, "Donor name is required"),
  phone: nullableTrimmedString,
  email: nullableTrimmedString,
  address: nullableTrimmedString,
  isAnonymous: z.boolean().default(false),
});

export const createDonationSchema = z
  .object({
    devoteeId: z.string().uuid("Select a devotee").nullable().optional(),
    manualDonor: manualDonorSchema.nullable().optional(),
    amount: z.number().positive("Amount must be greater than zero"),
    purpose: z.string().trim().min(1, "Purpose is required").max(200),
    paymentMethod: paymentMethodSchema,
    notes: nullableTrimmedString,
    donatedAt: isoDateTime,
  })
  .superRefine((data, ctx) => {
    const hasDevotee = Boolean(data.devoteeId);
    const hasManual = Boolean(data.manualDonor?.name);
    if (hasDevotee === hasManual) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: hasDevotee
          ? "Choose either an existing devotee or a manual donor, not both"
          : "Select a devotee or enter a manual donor's name",
        path: ["devoteeId"],
      });
    }
  });

export const updateDonationSchema = z
  .object({
    devoteeId: z.string().uuid("Select a devotee").optional(),
    manualDonor: manualDonorSchema.optional(),
    amount: z.number().positive("Amount must be greater than zero").optional(),
    purpose: z.string().trim().min(1, "Purpose is required").max(200).optional(),
    paymentMethod: paymentMethodSchema.optional(),
    notes: nullableTrimmedString,
    donatedAt: isoDateTime.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.devoteeId !== undefined && data.manualDonor !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose either an existing devotee or a manual donor, not both",
        path: ["devoteeId"],
      });
    }
  });

export type CreateDonationPayload = z.infer<typeof createDonationSchema>;
export type UpdateDonationPayload = z.infer<typeof updateDonationSchema>;
