import { z } from "zod";
import { GENDER_OPTIONS } from "@/types/db";
import { dateOfBirthSchema } from "./devotees";

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

/** A donor with no devotee record — see migrations/024_donation_manual_donor.sql. Kept for the API/DB layer's existing manual-donor capability (e.g. bulk import's phone-mismatch fallback); the Add Donation dialog itself no longer exposes a manual-donor mode — see newDevoteeForDonationSchema below. */
export const manualDonorSchema = z.object({
  name: z.string().trim().min(1, "Donor name is required"),
  phone: nullableTrimmedString,
  email: nullableTrimmedString,
  address: nullableTrimmedString,
  isAnonymous: z.boolean().default(false),
});

/**
 * The "smart donor search" flow's no-match path — record a donation for
 * someone with no existing devotee record by creating one inline, in the
 * same request. Deliberately minimal: only what temple staff would actually
 * know while standing at the counter. Reuses dateOfBirthSchema from
 * lib/validation/devotees.ts (same YYYY-MM-DD + no-future-date rules) rather
 * than redefining it.
 */
export const newDevoteeForDonationSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(200),
  whatsappPhone: z.string().trim().min(1, "Mobile number is required"),
  gender: z.enum(GENDER_OPTIONS).nullable().optional(),
  dateOfBirth: dateOfBirthSchema,
});

export const createDonationSchema = z
  .object({
    devoteeId: z.string().uuid("Select a devotee").nullable().optional(),
    manualDonor: manualDonorSchema.nullable().optional(),
    newDevotee: newDevoteeForDonationSchema.nullable().optional(),
    amount: z.number().positive("Amount must be greater than zero").nullable().optional(),
    purpose: z.string().trim().min(1, "Purpose is required").max(200),
    paymentMethod: paymentMethodSchema.nullable().optional(),
    itemDescription: z.string().trim().min(1, "Describe the item being donated").max(500).nullable().optional(),
    notes: nullableTrimmedString,
    donatedAt: isoDateTime,
  })
  .superRefine((data, ctx) => {
    // Donor: exactly one of devoteeId / manualDonor / newDevotee must be set.
    const donorModeCount = [Boolean(data.devoteeId), Boolean(data.manualDonor?.name), Boolean(data.newDevotee?.displayName)].filter(
      Boolean,
    ).length;
    if (donorModeCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          donorModeCount === 0
            ? "Select a devotee or enter donor details"
            : "A donation can only have one donor — choose an existing devotee or provide new devotee details, not both",
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
