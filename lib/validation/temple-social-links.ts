import { z } from "zod";

export const socialPlatformSchema = z.enum([
  "facebook",
  "instagram",
  "youtube",
  "twitter",
  "website",
  "other",
]);

export const upsertSocialLinkSchema = z.object({
  url: z.string().trim().url("Must be a valid URL"),
});

export type UpsertSocialLinkPayload = z.infer<typeof upsertSocialLinkSchema>;
