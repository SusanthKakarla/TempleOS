import { z } from "zod";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, RELATIONSHIP_CODES } from "@/types/db";
import { dateOfBirthSchema } from "./devotees";

const nullableTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const uuidSchema = z.string().uuid();
const relationshipSchema = z.enum(RELATIONSHIP_CODES);
const genderSchema = z.enum(GENDER_OPTIONS).nullable().optional();
const maritalStatusSchema = z.enum(MARITAL_STATUS_OPTIONS).nullable().optional();
const languageSchema = z.enum(["en", "te"]);

const devoteeSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(200),
  /** Optional — phone number is contact info only, never required to create a devotee (Scenario 2). */
  whatsappPhone: nullableTrimmedString,
  whatsappOptInStatus: z.boolean().optional(),
  dateOfBirth: dateOfBirthSchema,
  birthStar: nullableTrimmedString,
  ancestralLineage: nullableTrimmedString,
  gender: genderSchema,
  maritalStatus: maritalStatusSchema,
  weddingAnniversary: dateOfBirthSchema,
});

const newMemberSchema = z.object({
  kind: z.literal("new"),
  displayName: z.string().trim().min(1, "Member name is required").max(200),
  relationship: relationshipSchema,
  whatsappPhone: nullableTrimmedString,
  gender: genderSchema,
  maritalStatus: maritalStatusSchema,
  dateOfBirth: dateOfBirthSchema,
  weddingAnniversary: dateOfBirthSchema,
  birthStar: nullableTrimmedString,
  ancestralLineage: nullableTrimmedString,
});

const existingMemberSchema = z
  .object({
    kind: z.literal("existing"),
    devoteeId: uuidSchema,
    relationship: relationshipSchema,
    currentFamilyId: uuidSchema.nullable().optional(),
    moveFromExistingFamily: z.boolean().optional(),
  })
  .refine((member) => !member.currentFamilyId || member.moveFromExistingFamily === true, {
    message: "Confirm moving this devotee from their current family",
    path: ["moveFromExistingFamily"],
  });

const familyNoneSchema = z.object({ mode: z.literal("none") });

const existingFamilySchema = z.object({
  mode: z.literal("existing"),
  familyId: uuidSchema,
  relationship: relationshipSchema,
});

const newFamilySchema = z
  .object({
    mode: z.literal("new"),
    familyName: z.string().trim().min(1, "Family name is required").max(200),
    address: nullableTrimmedString,
    city: nullableTrimmedString,
    state: nullableTrimmedString,
    pincode: nullableTrimmedString,
    primaryLanguage: languageSchema.nullable().optional(),
    primaryRelationship: relationshipSchema,
    members: z.array(z.discriminatedUnion("kind", [existingMemberSchema, newMemberSchema])).default([]),
  })
  .refine(
    (family) =>
      [family.primaryRelationship, ...family.members.map((member) => member.relationship)].filter(
        (relationship) => relationship === "head_of_family",
      ).length === 1,
    { message: "A family must have exactly one Head of Family", path: ["members"] },
  );

export const devoteeRegistrationSchema = z.object({
  devotee: devoteeSchema,
  family: z.discriminatedUnion("mode", [familyNoneSchema, existingFamilySchema, newFamilySchema]),
});

export type DevoteeRegistrationPayload = z.infer<typeof devoteeRegistrationSchema>;
