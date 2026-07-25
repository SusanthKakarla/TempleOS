import { z } from "zod";

const metaCategorySchema = z.enum(["UTILITY", "MARKETING", "AUTHENTICATION"]);

export const createWhatsAppTemplateSchema = z.object({
  templateKey: z.string().trim().min(1, "Template key is required").max(100),
  metaTemplateName: z.string().trim().min(1, "Meta template name is required").max(200),
  language: z.string().trim().min(2, "Language is required").max(10),
  metaCategory: metaCategorySchema,
  variables: z.array(z.string().trim().min(1)).max(20).default([]),
  fallbackStrategy: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const updateWhatsAppTemplateSchema = z.object({
  metaTemplateName: z.string().trim().min(1, "Meta template name is required").max(200).optional(),
  metaCategory: metaCategorySchema.optional(),
  variables: z.array(z.string().trim().min(1)).max(20).optional(),
  enabled: z.boolean().optional(),
  fallbackStrategy: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const testSendWhatsAppTemplateSchema = z.object({
  toPhone: z.string().trim().min(6, "A recipient phone number is required").max(20),
  /** Sample values for the template's declared variables, keyed by name — same shape as the real notification metadata context. */
  sampleContext: z.record(z.string(), z.string()).default({}),
});

export type CreateWhatsAppTemplatePayload = z.infer<typeof createWhatsAppTemplateSchema>;
export type UpdateWhatsAppTemplatePayload = z.infer<typeof updateWhatsAppTemplateSchema>;
export type TestSendWhatsAppTemplatePayload = z.infer<typeof testSendWhatsAppTemplateSchema>;
