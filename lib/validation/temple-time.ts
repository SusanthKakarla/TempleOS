import { z } from "zod";

/** "" -> null, otherwise must be a 24-hour HH:mm time. */
export const nullableTimeOfDay = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .refine((value) => value === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
    message: "Must be a valid time in HH:mm (24-hour) format",
  })
  .nullable()
  .optional();

/** "HH:mm" strings sort lexicographically the same as chronologically. */
export function isCloseAfterOpen(
  open: string | null | undefined,
  close: string | null | undefined,
): boolean {
  if (!open || !close) return true; // only enforce ordering when both are actually set
  return close > open;
}
