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

export const eventStatusSchema = z.enum(["draft", "published", "cancelled"]);

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: nullableTrimmedString,
    location: nullableTrimmedString,
    startsAt: isoDateTime,
    endsAt: isoDateTime.nullable().optional(),
    status: eventStatusSchema.default("draft"),
    bannerMediaId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) => !data.endsAt || Date.parse(data.endsAt) >= Date.parse(data.startsAt),
    { message: "End time must be after start time", path: ["endsAt"] },
  );

export const updateEventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200).optional(),
    description: nullableTrimmedString,
    location: nullableTrimmedString,
    startsAt: isoDateTime.optional(),
    endsAt: isoDateTime.nullable().optional(),
    status: eventStatusSchema.optional(),
    bannerMediaId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) =>
      !data.startsAt || !data.endsAt || Date.parse(data.endsAt) >= Date.parse(data.startsAt),
    { message: "End time must be after start time", path: ["endsAt"] },
  );

export type CreateEventPayload = z.infer<typeof createEventSchema>;
export type UpdateEventPayload = z.infer<typeof updateEventSchema>;
