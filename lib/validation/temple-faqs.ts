import { z } from "zod";

export const createFaqSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(500),
  answer: z.string().trim().min(1, "Answer is required").max(2000),
});

export const updateFaqSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(500).optional(),
  answer: z.string().trim().min(1, "Answer is required").max(2000).optional(),
});

export type CreateFaqPayload = z.infer<typeof createFaqSchema>;
export type UpdateFaqPayload = z.infer<typeof updateFaqSchema>;
