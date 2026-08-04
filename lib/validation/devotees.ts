import { z } from "zod";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, RELATIONSHIP_CODES } from "@/types/db";

const nullableTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const dateOfBirthSchema = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Must be a YYYY-MM-DD date",
  })
  .refine((value) => value === null || value <= new Date().toISOString().slice(0, 10), {
    message: "Date cannot be in the future",
  })
  .nullable()
  .optional();

const genderSchema = z.enum(GENDER_OPTIONS).nullable().optional();
const maritalStatusSchema = z.enum(MARITAL_STATUS_OPTIONS).nullable().optional();
const preferredLanguageSchema = z.enum(["en", "te"]).nullable().optional();
const familyIdSchema = z.string().uuid().nullable().optional();

export const createDevoteeSchema = z.object({
  /** Optional — phone number is contact info only, never required to create a devotee (Scenario 2). */
  whatsappPhone: nullableTrimmedString,
  displayName: z.string().trim().min(1, "Name is required").max(200),
  whatsappOptInStatus: z.boolean().optional(),
  dateOfBirth: dateOfBirthSchema,
  birthStar: nullableTrimmedString,
  ancestralLineage: nullableTrimmedString,
  gender: genderSchema,
  maritalStatus: maritalStatusSchema,
  weddingAnniversary: dateOfBirthSchema,
});

export const newFamilyForDevoteeSchema = z.object({
  familyName: z.string().trim().min(1, "Family name is required").max(200),
  relationship: z.enum(RELATIONSHIP_CODES),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  pincode: z.string().trim().optional().nullable(),
});

export const updateDevoteeSchema = z.object({
  /** Optional and clearable — phone is contact info only, never required (Scenario 2); an empty string clears it. */
  whatsappPhone: nullableTrimmedString,
  displayName: z.string().trim().min(1, "Name is required").max(200).optional(),
  whatsappOptInStatus: z.boolean().optional(),
  dateOfBirth: dateOfBirthSchema,
  birthStar: nullableTrimmedString,
  ancestralLineage: nullableTrimmedString,
  eventNotificationsEnabled: z.boolean().optional(),
  gender: genderSchema,
  maritalStatus: maritalStatusSchema,
  weddingAnniversary: dateOfBirthSchema,
  familyId: familyIdSchema,
  /** Required alongside familyId when attaching to an already-existing family (as opposed to leaving familyId untouched, or creating one via newFamily). */
  familyRelationship: z.enum(RELATIONSHIP_CODES).optional(),
  address: nullableTrimmedString,
  notes: nullableTrimmedString,
  preferredLanguage: preferredLanguageSchema,
  newFamily: newFamilyForDevoteeSchema.optional(),
});

export type CreateDevoteePayload = z.infer<typeof createDevoteeSchema>;
export type UpdateDevoteePayload = z.infer<typeof updateDevoteeSchema>;
