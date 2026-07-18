import { z } from "zod";
import { isCloseAfterOpen, nullableTimeOfDay } from "./temple-time";

const nullableTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const nullableEmail = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .refine((value) => value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: "Must be a valid email address",
  })
  .nullable()
  .optional();

export const updateTenantSettingsSchema = z
  .object({
    name: z.string().trim().min(1, "Temple name is required").max(200).optional(),
    welcomeMessage: nullableTrimmedString,
    description: nullableTrimmedString,
    history: nullableTrimmedString,
    defaultContactPhone: nullableTrimmedString,
    address: nullableTrimmedString,
    contactEmail: nullableEmail,
    googleMapsLink: nullableTrimmedString,
    morningOpen: nullableTimeOfDay,
    morningClose: nullableTimeOfDay,
    eveningOpen: nullableTimeOfDay,
    eveningClose: nullableTimeOfDay,
    donationInfo: nullableTrimmedString,
    notifyOnNewEvent: z.boolean().optional(),
    notifyOnEventUpdated: z.boolean().optional(),
    notifyOnEventCancelled: z.boolean().optional(),
  })
  .refine((data) => isCloseAfterOpen(data.morningOpen, data.morningClose), {
    message: "Morning close must be after morning open",
    path: ["morningClose"],
  })
  .refine((data) => isCloseAfterOpen(data.eveningOpen, data.eveningClose), {
    message: "Evening close must be after evening open",
    path: ["eveningClose"],
  });

export type UpdateTenantSettingsPayload = z.infer<typeof updateTenantSettingsSchema>;
