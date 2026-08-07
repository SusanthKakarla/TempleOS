import { z } from "zod";
import { CAMPAIGN_TYPES, NOTIFICATION_TYPES } from "@/types/db";

const nullableTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const nullableDateOnlyString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Must be a valid date" })
  .nullable()
  .optional();

/**
 * Goal amount is mandatory for every campaign (every campaign is a donation
 * campaign — see CAMPAIGN_TYPE in campaign-form-dialog.tsx). Empty/missing is
 * a validation error, not a silent transform to null. `updateCampaignSchema`'s
 * `.partial()` still lets a PATCH omit this field entirely (leaves the
 * existing value untouched) — it only rejects the field when the caller
 * actually sends it and it's empty/zero/negative/non-numeric.
 */
const requiredPositiveAmountString = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => value.length > 0, { message: "Goal amount is required." })
  .refine((value) => Number.isNaN(Number(value)) === false, { message: "Goal amount must be a valid number." })
  .refine((value) => Number(value) > 0, { message: "Goal amount must be greater than ₹0." });

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
  templateKey: z.enum(NOTIFICATION_TYPES).nullable().optional(),
  audienceFilter: campaignAudienceFilterSchema.default({ type: "all" }),
  bannerMediaId: z.string().uuid().nullable().optional(),
  linkedEventId: z.string().uuid().nullable().optional(),
  scheduleType: campaignScheduleTypeSchema.default("one_time"),
  scheduledAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Must be a valid date/time" })
    .refine((value) => Date.parse(value) > Date.now(), { message: "Scheduled time must be in the future" })
    .nullable()
    .optional(),
  recurrenceRule: nullableTrimmedString,
  goalAmount: requiredPositiveAmountString,
  campaignStartDate: nullableDateOnlyString,
  campaignEndDate: nullableDateOnlyString,
  /**
   * Optional public-page gallery, as an ordered list of already-uploaded
   * notification_media ids (array order = display order). Capped so a
   * runaway client can't attach an unbounded gallery; tenant ownership of
   * each id is enforced in replaceCampaignGallery, not here.
   */
  galleryMediaIds: z.array(z.string().uuid()).max(12).optional(),
  /** One per dialog-open on the client — lets POST /api/campaigns collapse a duplicate submission into the original row instead of creating a second campaign. See migrations/040 and lib/db/campaigns.ts's getCampaignByClientRequestId. */
  clientRequestId: z.string().uuid().nullable().optional(),
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
