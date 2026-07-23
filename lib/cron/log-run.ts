import { createAuditLogEntry } from "@/lib/db/audit-log";

/**
 * Placeholder actor for platform-wide (not tenant-scoped) system audit
 * entries — audit_log.actor_id is UUID NOT NULL with no FK, so any valid
 * UUID literal is accepted; this one is never a real row.
 */
export const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Records that a Railway Cron job actually ran, every invocation — including
 * zero-work runs. This is the only way to tell "the job is scheduled but had
 * nothing to do" apart from "the job was never scheduled at all", which is
 * otherwise indistinguishable from the outside.
 */
export async function logCronRun(job: string, metadata: Record<string, unknown> = {}): Promise<void> {
  await createAuditLogEntry({
    actorType: "system",
    actorId: SYSTEM_ACTOR_ID,
    tenantId: null,
    action: `cron.${job}`,
    targetType: "cron",
    targetId: null,
    metadata,
  });
}
