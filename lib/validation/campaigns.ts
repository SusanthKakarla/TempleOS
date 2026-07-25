import { z } from "zod";
import { CAMPAIGN_TYPES } from "@/types/db";

const nullableTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const campaignTypeSchema = z.enum(CAMPAIGN_TYPES);
export const campaignChannelSchema = z.enum(["in_app", "whatsapp"]);
export const campaignScheduleTypeSchema = z.enum(["one_time", "recurring"]);

export const campaignAudienceFilterSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }),
  z.object({ type: z.literal("active") }),
  z.object({ type: z.literal("donors") }),
  z.object({ type: z.literal("opted_in") }),
  z.object({ type: z.literal("language"), language: z.enum(["en", "te"]) }),
  z.object({ type: z.literal("family"), familyId: z.string().uuid() }),
  z.object({ type: z.literal("event_attendees"), eventId: z.string().uuid() }),
]);

export const createCampaignSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: nullableTrimmedString,
  campaignType: campaignTypeSchema,
  channel: campaignChannelSchema.default("whatsapp"),
  templateKey: z.string().trim().min(1).nullable().optional(),
  customMessage: nullableTrimmedString,
  audienceFilter: campaignAudienceFilterSchema.default({ type: "all" }),
  bannerMediaId: z.string().uuid().nullable().optional(),
  linkedEventId: z.string().uuid().nullable().optional(),
  linkedDonationPurpose: nullableTrimmedString,
  scheduleType: campaignScheduleTypeSchema.default("one_time"),
  scheduledAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Must be a valid date/time" })
    .nullable()
    .optional(),
  recurrenceRule: nullableTrimmedString,
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const campaignStatusTransitionSchema = z.enum([
  "scheduled",
  "running",
  "paused",
  "cancelled",
  "completed",
  "archived",
]);

export type CreateCampaignPayload = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignPayload = z.infer<typeof updateCampaignSchema>;
