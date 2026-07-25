import type { WhatsAppMessageTemplate } from "@/types/db";
import { resolveTemplateVariables } from "./template-variable-resolver";

export type TemplateValidationFailureCategory =
  | "template_missing"
  | "template_not_approved"
  | "template_disabled"
  | "invalid_variables"
  | "invalid_recipient";

export type TemplateValidationResult =
  | { ok: true; template: WhatsAppMessageTemplate; params: string[] }
  | { ok: false; category: TemplateValidationFailureCategory; reason: string };

/**
 * Fail-fast checks before a template send ever reaches Meta — mirrors the
 * spec's validation checklist (approved / enabled / variables complete /
 * recipient valid). `getTemplateForNotification` already filters to
 * approved+enabled rows, so a null template covers "missing"; the explicit
 * approvalStatus/enabled checks here still matter for callers that pass an
 * arbitrary template directly (e.g. the admin "Test Send" action, which
 * should surface the same validation failure a real send would hit).
 */
export function validateTemplate(
  template: WhatsAppMessageTemplate | null,
  toPhone: string | null | undefined,
  context: Record<string, string | undefined>,
): TemplateValidationResult {
  if (!template) {
    return {
      ok: false,
      category: "template_missing",
      reason: "No approved WhatsApp template is configured for this notification type/language.",
    };
  }
  if (template.approvalStatus !== "approved") {
    return {
      ok: false,
      category: "template_not_approved",
      reason: `Template "${template.metaTemplateName}" is not approved yet (status: ${template.approvalStatus}).`,
    };
  }
  if (!template.enabled) {
    return {
      ok: false,
      category: "template_disabled",
      reason: `Template "${template.metaTemplateName}" is disabled.`,
    };
  }
  if (!toPhone) {
    return { ok: false, category: "invalid_recipient", reason: "Recipient phone number is missing." };
  }
  const resolution = resolveTemplateVariables(template.variables, context);
  if (!resolution.ok) {
    return {
      ok: false,
      category: "invalid_variables",
      reason: `Missing template variables: ${resolution.missing.join(", ")}.`,
    };
  }
  return { ok: true, template, params: resolution.values };
}
