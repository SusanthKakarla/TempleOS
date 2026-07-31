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

export const paymentMethodSchema = z.enum(["cash", "upi", "bank_transfer", "cheque", "other", "razorpay"]);

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
    amount: z.number().positive("Amount must be greater than zero").nullable().optional(),
    purpose: z.string().trim().min(1, "Purpose is required").max(200),
    paymentMethod: paymentMethodSchema.nullable().optional(),
    itemDescription: z.string().trim().min(1, "Describe the item being donated").max(500).nullable().optional(),
    notes: nullableTrimmedString,
    donatedAt: isoDateTime,
  })
  .superRefine((data, ctx) => {
    // Donor: exactly one of devoteeId or manualDonor must be set.
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

    // Amount: XOR between cash (amount + paymentMethod) and non-cash (itemDescription).
    const isNonCash = Boolean(data.itemDescription);
    if (isNonCash) {
      if (data.amount != null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be empty for non-cash donations", path: ["amount"] });
      }
      if (data.paymentMethod != null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payment method must be empty for non-cash donations", path: ["paymentMethod"] });
      }
    } else {
      if (!data.amount || data.amount <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be greater than zero", path: ["amount"] });
      }
      if (!data.paymentMethod) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payment method is required", path: ["paymentMethod"] });
      }
    }
  });

export const updateDonationSchema = z
  .object({
    devoteeId: z.string().uuid("Select a devotee").optional(),
    manualDonor: manualDonorSchema.optional(),
    // Cash/non-cash fields are updated as a group — see superRefine below.
    amount: z.number().positive("Amount must be greater than zero").nullable().optional(),
    purpose: z.string().trim().min(1, "Purpose is required").max(200).optional(),
    paymentMethod: paymentMethodSchema.nullable().optional(),
    itemDescription: z.string().trim().min(1, "Describe the item being donated").max(500).nullable().optional(),
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

    // Cash/non-cash XOR: only enforced when itemDescription is explicitly present in the payload.
    // This allows existing partial patches like { amount: 250 } or { notes: "x" } to pass unchanged,
    // while preventing incoherent non-cash updates like { itemDescription: "rice", amount: 500 }.
    // The donation form always submits all three fields together (full-shape for cash/material).
    if ("itemDescription" in data) {
      const isNonCash = Boolean(data.itemDescription);
      if (isNonCash) {
        if (data.amount != null) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be empty for non-cash donations", path: ["amount"] });
        }
        if (data.paymentMethod != null) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payment method must be empty for non-cash donations", path: ["paymentMethod"] });
        }
      }
    }
  });

export type CreateDonationPayload = z.infer<typeof createDonationSchema>;
export type UpdateDonationPayload = z.infer<typeof updateDonationSchema>;
