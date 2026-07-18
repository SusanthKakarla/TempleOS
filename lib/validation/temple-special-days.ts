import { z } from "zod";
import { isCloseAfterOpen, nullableTimeOfDay } from "./temple-time";

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

export const createSpecialDaySchema = z
  .object({
    date: dateSchema,
    occasion: z.string().trim().min(1, "Occasion is required").max(200),
    isClosed: z.boolean().default(false),
    morningOpen: nullableTimeOfDay,
    morningClose: nullableTimeOfDay,
    eveningOpen: nullableTimeOfDay,
    eveningClose: nullableTimeOfDay,
  })
  .refine((data) => isCloseAfterOpen(data.morningOpen, data.morningClose), {
    message: "Morning close must be after morning open",
    path: ["morningClose"],
  })
  .refine((data) => isCloseAfterOpen(data.eveningOpen, data.eveningClose), {
    message: "Evening close must be after evening open",
    path: ["eveningClose"],
  });

export const updateSpecialDaySchema = z
  .object({
    date: dateSchema.optional(),
    occasion: z.string().trim().min(1, "Occasion is required").max(200).optional(),
    isClosed: z.boolean().optional(),
    morningOpen: nullableTimeOfDay,
    morningClose: nullableTimeOfDay,
    eveningOpen: nullableTimeOfDay,
    eveningClose: nullableTimeOfDay,
  })
  .refine((data) => isCloseAfterOpen(data.morningOpen, data.morningClose), {
    message: "Morning close must be after morning open",
    path: ["morningClose"],
  })
  .refine((data) => isCloseAfterOpen(data.eveningOpen, data.eveningClose), {
    message: "Evening close must be after evening open",
    path: ["eveningClose"],
  });

export type CreateSpecialDayPayload = z.infer<typeof createSpecialDaySchema>;
export type UpdateSpecialDayPayload = z.infer<typeof updateSpecialDaySchema>;
