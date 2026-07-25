import { insertTemplateIfMissing } from "@/lib/db/whatsapp-message-templates";
import { STANDARD_TEMPLATE_CATALOG, buildSubmissionGuide } from "./standard-template-catalog";

export interface BootstrapStandardTemplatesResult {
  created: string[];
  alreadyExisted: string[];
}

/**
 * Idempotent — safe to call on every WhatsApp connect/reconnect, and again
 * from the "Setup WhatsApp Templates" bulk route. Only ever inserts rows
 * that don't already exist (tenant_id, template_key, language); never
 * updates an existing row, so it can never clobber an admin's later edits.
 * No Graph API calls — pure DB orchestration.
 */
export async function bootstrapStandardTemplates(tenantId: string): Promise<BootstrapStandardTemplatesResult> {
  const created: string[] = [];
  const alreadyExisted: string[] = [];

  for (const entry of STANDARD_TEMPLATE_CATALOG) {
    const key = `${entry.templateKey}:${entry.language}`;
    const inserted = await insertTemplateIfMissing(tenantId, {
      templateKey: entry.templateKey,
      metaTemplateName: entry.metaTemplateName,
      language: entry.language,
      metaCategory: entry.metaCategory,
      variables: entry.variables,
      description: entry.description,
      submissionGuide: buildSubmissionGuide(entry.appBody, entry.variables),
    });
    if (inserted) {
      created.push(key);
    } else {
      alreadyExisted.push(key);
    }
  }

  return { created, alreadyExisted };
}
