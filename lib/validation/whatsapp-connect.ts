import { z } from "zod";

export const embeddedSignupCallbackSchema = z.object({
  code: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

export type EmbeddedSignupCallbackInput = z.infer<typeof embeddedSignupCallbackSchema>;
