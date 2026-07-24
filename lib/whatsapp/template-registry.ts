import { getApprovedTemplate, listTemplatesForTenant } from "@/lib/db/whatsapp-message-templates";
import type { WhatsAppMessageTemplate } from "@/types/db";

/** Read path for the delivery layer — the one enabled+approved template for a given tenant/notification-type/language, or null if none is configured yet (the state every tenant is in until an admin registers one). */
export async function getTemplateForNotification(
  tenantId: string,
  templateKey: string,
  language: string,
): Promise<WhatsAppMessageTemplate | null> {
  return getApprovedTemplate(tenantId, templateKey, language);
}

export async function listTemplates(tenantId: string): Promise<WhatsAppMessageTemplate[]> {
  return listTemplatesForTenant(tenantId);
}
