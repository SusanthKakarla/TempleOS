import { z } from "zod";
import { WEBSITE_HERO_TEMPLATES, WEBSITE_THEMES } from "@/types/db";

/**
 * Public-website presentation fields only.
 *
 * Deliberately has no timings, events, sevas, gallery or contact fields: those
 * are operational data owned by their existing admin modules, and the website
 * reads them live. Adding them here would create a second copy that could
 * drift from what the temple actually maintains.
 */
const nullableText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const updateWebsiteSchema = z.object({
  enabled: z.boolean().optional(),
  heroTemplate: z.enum(WEBSITE_HERO_TEMPLATES).optional(),
  theme: z.enum(WEBSITE_THEMES).optional(),
  displayName: nullableText(200),
  deityName: nullableText(120),
  heroTitle: nullableText(200),
  heroSubtitle: nullableText(400),
  story: nullableText(8000),
  aboutContent: nullableText(8000),
  seoTitle: nullableText(200),
  seoDescription: nullableText(400),
  deityMediaId: z.string().uuid().nullable().optional(),
  heroMediaId: z.string().uuid().nullable().optional(),
  logoMediaId: z.string().uuid().nullable().optional(),
  ogMediaId: z.string().uuid().nullable().optional(),
  languages: z.array(z.enum(["en", "te"])).min(1).max(2).optional(),
});

export type UpdateWebsitePayload = z.infer<typeof updateWebsiteSchema>;
