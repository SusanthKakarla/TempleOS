import { z } from "zod";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS } from "@/types/db";

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
  .nullable()
  .optional();

const genderSchema = z.enum(GENDER_OPTIONS).nullable().optional();
const maritalStatusSchema = z.enum(MARITAL_STATUS_OPTIONS).nullable().optional();

export const createDevoteeSchema = z.object({
  whatsappPhone: z.string().trim().min(1, "Phone number is required"),
  displayName: z.string().trim().min(1, "Name is required").max(200),
  dateOfBirth: dateOfBirthSchema,
  birthStar: nullableTrimmedString,
  ancestralLineage: nullableTrimmedString,
  gender: genderSchema,
  maritalStatus: maritalStatusSchema,
  weddingAnniversary: dateOfBirthSchema,
});

export const updateDevoteeSchema = z.object({
  whatsappPhone: z.string().trim().min(1, "Phone number is required").optional(),
  displayName: z.string().trim().min(1, "Name is required").max(200).optional(),
  dateOfBirth: dateOfBirthSchema,
  birthStar: nullableTrimmedString,
  ancestralLineage: nullableTrimmedString,
  eventNotificationsEnabled: z.boolean().optional(),
  gender: genderSchema,
  maritalStatus: maritalStatusSchema,
  weddingAnniversary: dateOfBirthSchema,
});

export type CreateDevoteePayload = z.infer<typeof createDevoteeSchema>;
export type UpdateDevoteePayload = z.infer<typeof updateDevoteeSchema>;
