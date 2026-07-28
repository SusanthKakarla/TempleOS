import { sendTemplateMessage, type SendMessageResult, type TemplateHeaderDocument } from "./client";
import { getTemplateForNotification } from "./template-registry";
import { validateTemplate, type TemplateValidationFailureCategory } from "./template-validator";
import type { WhatsAppMessageTemplate } from "@/types/db";

export interface TemplateSendResult extends SendMessageResult {
  template: WhatsAppMessageTemplate | null;
  /** Set when the send never reached Meta — validation failed locally first. */
  validationFailure?: TemplateValidationFailureCategory;
}

/**
 * Loads the approved template for (tenant, templateKey, language), validates
 * it against the given variable context, and sends it — the one place that
 * ties template-registry + template-validator + client.ts's sendTemplateMessage
 * together. Returns before ever calling Meta if validation fails, tagged with
 * the specific failure category so the caller classifies it correctly (see
 * lib/whatsapp/errors.ts) instead of treating every failure as a network error.
 */
export async function sendTemplate(
  phoneNumberId: string,
  tenantId: string,
  templateKey: string,
  language: string,
  toPhone: string,
  context: Record<string, string | undefined>,
  headerDocument?: TemplateHeaderDocument,
): Promise<TemplateSendResult> {
  const template = await getTemplateForNotification(tenantId, templateKey, language);
  const validation = validateTemplate(template, toPhone, context);
  if (!validation.ok) {
    return {
      success: false,
      providerMessageId: null,
      error: validation.reason,
      template,
      validationFailure: validation.category,
    };
  }

  const result = await sendTemplateMessage(
    phoneNumberId,
    toPhone,
    validation.template.metaTemplateName,
    language,
    validation.params,
    headerDocument,
  );
  return { ...result, template: validation.template };
}
