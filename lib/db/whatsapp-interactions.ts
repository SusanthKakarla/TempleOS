import { getPool } from "./pool";
import type { InteractionType, WhatsAppInteraction } from "@/types/db";

interface WhatsAppInteractionRow {
  id: string;
  tenant_id: string;
  devotee_id: string | null;
  interaction_type: InteractionType;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

function mapInteraction(row: WhatsAppInteractionRow): WhatsAppInteraction {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    devoteeId: row.devotee_id,
    interactionType: row.interaction_type,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
  };
}

export async function logWhatsAppInteraction(
  tenantId: string,
  devoteeId: string | null,
  interactionType: InteractionType,
  metadata?: Record<string, unknown>,
): Promise<WhatsAppInteraction> {
  const { rows } = await getPool().query<WhatsAppInteractionRow>(
    `INSERT INTO whatsapp_interactions (tenant_id, devotee_id, interaction_type, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [tenantId, devoteeId, interactionType, metadata ? JSON.stringify(metadata) : null],
  );
  return mapInteraction(rows[0]);
}
