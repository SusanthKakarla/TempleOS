import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import type { AuditLogEntry } from "@/types/db";

interface AuditLogRow {
  id: string;
  actor_type: AuditLogEntry["actorType"];
  actor_id: string;
  tenant_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface CreateAuditLogEntryInput {
  actorType: AuditLogEntry["actorType"];
  actorId: string;
  tenantId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata?: Record<string, unknown>;
}

function mapAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    tenantId: row.tenant_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createAuditLogEntry(
  input: CreateAuditLogEntryInput,
  client: QueryClient = getPool(),
): Promise<AuditLogEntry> {
  const { rows } = await client.query<AuditLogRow>(
    `INSERT INTO audit_log (actor_type, actor_id, tenant_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING *`,
    [
      input.actorType,
      input.actorId,
      input.tenantId,
      input.action,
      input.targetType,
      input.targetId,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return mapAuditLogEntry(rows[0]);
}
