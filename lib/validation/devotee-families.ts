import { z } from "zod";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, RELATIONSHIP_CODES } from "@/types/db";
import { dateOfBirthSchema } from "./devotees";

const languageSchema = z.enum(["en", "te"]);

const nullableTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const familyMemberSchema = z.object({
  displayName: z.string().trim().min(1, "Member name is required").max(200),
  relationship: z.enum(RELATIONSHIP_CODES),
  gender: z.enum(GENDER_OPTIONS).nullable().optional(),
  maritalStatus: z.enum(MARITAL_STATUS_OPTIONS).nullable().optional(),
  dateOfBirth: dateOfBirthSchema,
  weddingAnniversary: dateOfBirthSchema,
  birthStar: nullableTrimmedString,
  ancestralLineage: nullableTrimmedString,
  whatsappPhone: nullableTrimmedString,
});

export const createFamilySchema = z.object({
  familyName: z.string().trim().min(1, "Family name is required").max(200),
  address: nullableTrimmedString,
  city: nullableTrimmedString,
  state: nullableTrimmedString,
  pincode: nullableTrimmedString,
  primaryLanguage: languageSchema.nullable().optional(),
  members: z
    .array(familyMemberSchema)
    .min(1, "Add at least one family member")
    .refine((members) => members.filter((m) => m.relationship === "head_of_family").length === 1, {
      message: "A family must have exactly one Head of Family",
    }),
});

export const updateFamilySchema = z.object({
  familyName: z.string().trim().min(1, "Family name is required").max(200),
  address: nullableTrimmedString,
  city: nullableTrimmedString,
  state: nullableTrimmedString,
  pincode: nullableTrimmedString,
  primaryLanguage: languageSchema.nullable().optional(),
  members: z
    .array(familyMemberSchema.extend({ id: z.string().uuid().optional() }))
    .min(1, "Add at least one family member")
    .refine((members) => members.filter((m) => m.relationship === "head_of_family").length === 1, {
      message: "A family must have exactly one Head of Family",
    }),
});

export type CreateFamilyPayload = z.infer<typeof createFamilySchema>;
export type UpdateFamilyPayload = z.infer<typeof updateFamilySchema>;
