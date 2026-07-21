import { z } from "zod";

export const embeddedSignupCallbackSchema = z.object({
  code: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

export type EmbeddedSignupCallbackInput = z.infer<typeof embeddedSignupCallbackSchema>;

/** Super Admin's manual/operator-managed connect form — field names mirror features/super-admin/new-temple-form.tsx's WhatsApp step. */
export const manualWhatsAppConnectSchema = z.object({
  phoneNumber: z.string().trim().min(1, "Phone number is required"),
  metaPhoneNumberId: z.string().trim().min(1, "Meta phone number ID is required"),
  metaBusinessAccountId: z.string().trim().min(1, "Meta business account ID is required"),
  businessName: z
    .string()
    .trim()
    .min(1)
    .optional()
    .nullable()
    .transform((value) => value || null),
});

export type ManualWhatsAppConnectInput = z.infer<typeof manualWhatsAppConnectSchema>;
