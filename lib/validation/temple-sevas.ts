import { z } from "zod";

const nullableTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const dayOfWeekSchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export const createSevaSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: nullableTrimmedString,
  price: z.number().nonnegative("Price cannot be negative").nullable().optional(),
  duration: nullableTrimmedString,
  availableDays: z.array(dayOfWeekSchema).max(7).default([]),
  bookingEnabled: z.boolean().default(false),
});

export const updateSevaSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  description: nullableTrimmedString,
  price: z.number().nonnegative("Price cannot be negative").nullable().optional(),
  duration: nullableTrimmedString,
  availableDays: z.array(dayOfWeekSchema).max(7).optional(),
  bookingEnabled: z.boolean().optional(),
});

export type CreateSevaPayload = z.infer<typeof createSevaSchema>;
export type UpdateSevaPayload = z.infer<typeof updateSevaSchema>;
