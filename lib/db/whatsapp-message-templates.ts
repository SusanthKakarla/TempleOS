import { getPool } from "./pool";
import type {
  WhatsAppMessageTemplate,
  WhatsAppTemplateApprovalStatus,
  WhatsAppTemplateMetaCategory,
} from "@/types/db";

interface WhatsAppMessageTemplateRow {
  id: string;
  tenant_id: string;
  template_key: string;
  meta_template_name: string;
  language: string;
  meta_category: WhatsAppTemplateMetaCategory;
  variables: string[];
  approval_status: WhatsAppTemplateApprovalStatus;
  enabled: boolean;
  fallback_strategy: string | null;
  description: string | null;
  version: number;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapTemplate(row: WhatsAppMessageTemplateRow): WhatsAppMessageTemplate {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    templateKey: row.template_key,
    metaTemplateName: row.meta_template_name,
    language: row.language,
    metaCategory: row.meta_category,
    variables: row.variables,
    approvalStatus: row.approval_status,
    enabled: row.enabled,
    fallbackStrategy: row.fallback_strategy,
    description: row.description,
    version: row.version,
    lastSyncedAt: row.last_synced_at ? row.last_synced_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** The one enabled+approved template for a given tenant/notification-type/language — the shape the delivery layer actually sends. */
export async function getApprovedTemplate(
  tenantId: string,
  templateKey: string,
  language: string,
): Promise<WhatsAppMessageTemplate | null> {
  const { rows } = await getPool().query<WhatsAppMessageTemplateRow>(
    `SELECT * FROM whatsapp_message_templates
     WHERE tenant_id = $1 AND template_key = $2 AND language = $3
       AND approval_status = 'approved' AND enabled = true`,
    [tenantId, templateKey, language],
  );
  return rows[0] ? mapTemplate(rows[0]) : null;
}

export async function listTemplatesForTenant(tenantId: string): Promise<WhatsAppMessageTemplate[]> {
  const { rows } = await getPool().query<WhatsAppMessageTemplateRow>(
    "SELECT * FROM whatsapp_message_templates WHERE tenant_id = $1 ORDER BY template_key, language",
    [tenantId],
  );
  return rows.map(mapTemplate);
}

export async function getTemplateById(tenantId: string, id: string): Promise<WhatsAppMessageTemplate | null> {
  const { rows } = await getPool().query<WhatsAppMessageTemplateRow>(
    "SELECT * FROM whatsapp_message_templates WHERE tenant_id = $1 AND id = $2",
    [tenantId, id],
  );
  return rows[0] ? mapTemplate(rows[0]) : null;
}

export interface CreateWhatsAppMessageTemplateInput {
  templateKey: string;
  metaTemplateName: string;
  language: string;
  metaCategory: WhatsAppTemplateMetaCategory;
  variables: string[];
  fallbackStrategy?: string | null;
  description?: string | null;
}

export async function createTemplate(
  tenantId: string,
  input: CreateWhatsAppMessageTemplateInput,
): Promise<WhatsAppMessageTemplate> {
  const { rows } = await getPool().query<WhatsAppMessageTemplateRow>(
    `INSERT INTO whatsapp_message_templates
       (tenant_id, template_key, meta_template_name, language, meta_category, variables, fallback_strategy, description)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING *`,
    [
      tenantId,
      input.templateKey,
      input.metaTemplateName,
      input.language,
      input.metaCategory,
      JSON.stringify(input.variables),
      input.fallbackStrategy ?? null,
      input.description ?? null,
    ],
  );
  return mapTemplate(rows[0]);
}

export interface UpdateWhatsAppMessageTemplateInput {
  metaTemplateName?: string;
  metaCategory?: WhatsAppTemplateMetaCategory;
  variables?: string[];
  enabled?: boolean;
  fallbackStrategy?: string | null;
  description?: string | null;
}

/** Partial update — only bumps `version` when the sendable shape (name/category/variables) actually changes, not on enabled/description-only edits. */
export async function updateTemplate(
  tenantId: string,
  id: string,
  input: UpdateWhatsAppMessageTemplateInput,
): Promise<WhatsAppMessageTemplate | null> {
  const bumpsVersion = input.metaTemplateName !== undefined || input.metaCategory !== undefined || input.variables !== undefined;
  const { rows } = await getPool().query<WhatsAppMessageTemplateRow>(
    `UPDATE whatsapp_message_templates
     SET meta_template_name = COALESCE($3, meta_template_name),
         meta_category = COALESCE($4, meta_category),
         variables = COALESCE($5::jsonb, variables),
         enabled = COALESCE($6, enabled),
         fallback_strategy = CASE WHEN $7 THEN $8 ELSE fallback_strategy END,
         description = CASE WHEN $9 THEN $10 ELSE description END,
         version = CASE WHEN $11 THEN version + 1 ELSE version END,
         updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      tenantId,
      id,
      input.metaTemplateName ?? null,
      input.metaCategory ?? null,
      input.variables !== undefined ? JSON.stringify(input.variables) : null,
      input.enabled ?? null,
      input.fallbackStrategy !== undefined,
      input.fallbackStrategy ?? null,
      input.description !== undefined,
      input.description ?? null,
      bumpsVersion,
    ],
  );
  return rows[0] ? mapTemplate(rows[0]) : null;
}

export async function setApprovalStatus(
  tenantId: string,
  id: string,
  approvalStatus: WhatsAppTemplateApprovalStatus,
): Promise<WhatsAppMessageTemplate | null> {
  const { rows } = await getPool().query<WhatsAppMessageTemplateRow>(
    `UPDATE whatsapp_message_templates
     SET approval_status = $3, last_synced_at = now(), updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, id, approvalStatus],
  );
  return rows[0] ? mapTemplate(rows[0]) : null;
}

export async function deleteTemplate(tenantId: string, id: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    "DELETE FROM whatsapp_message_templates WHERE tenant_id = $1 AND id = $2",
    [tenantId, id],
  );
  return (rowCount ?? 0) > 0;
}
