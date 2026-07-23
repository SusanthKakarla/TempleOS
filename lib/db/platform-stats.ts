import { getPool } from "./pool";
import type { TenantStatus } from "@/types/db";

/**
 * NOT tenant-scoped by design — powers the Super Admin Dashboard's
 * platform-wide metrics, same deliberate exception pattern as
 * lib/db/tenants.ts's listTenantIdsAndTimezones.
 */
export interface PlatformTenantCounts {
  total: number;
  active: number;
  suspended: number;
  maintenance: number;
  archived: number;
  disabled: number;
}

export async function countTenantsByStatus(): Promise<PlatformTenantCounts> {
  const { rows } = await getPool().query<{ status: TenantStatus; count: string }>(
    "SELECT status, count(*) FROM tenants GROUP BY status",
  );
  const counts: PlatformTenantCounts = {
    total: 0,
    active: 0,
    suspended: 0,
    maintenance: 0,
    archived: 0,
    disabled: 0,
  };
  for (const row of rows) {
    counts[row.status] = Number(row.count);
    counts.total += Number(row.count);
  }
  return counts;
}

async function countAll(table: string, where?: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM ${table}${where ? ` WHERE ${where}` : ""}`,
  );
  return Number(rows[0]?.count ?? 0);
}

export interface PlatformActivityCounts {
  totalDevotees: number;
  totalTempleUsers: number;
  totalDonations: number;
  totalWhatsAppMessages: number;
  totalNotificationsSent: number;
  totalEvents: number;
  totalConversations: number;
}

export async function getPlatformActivityCounts(): Promise<PlatformActivityCounts> {
  const [
    totalDevotees,
    totalTempleUsers,
    totalDonations,
    totalWhatsAppMessages,
    totalNotificationsSent,
    totalEvents,
    totalConversations,
  ] = await Promise.all([
    countAll("devotees"),
    countAll("tenant_memberships", "status = 'active'"),
    countAll("donations"),
    countAll("whatsapp_messages"),
    countAll("notifications", "delivery_status = 'sent'"),
    countAll("events"),
    countAll("whatsapp_conversations"),
  ]);
  return {
    totalDevotees,
    totalTempleUsers,
    totalDonations,
    totalWhatsAppMessages,
    totalNotificationsSent,
    totalEvents,
    totalConversations,
  };
}

/** Every tenant with at least one connected WhatsApp account, vs. total tenants. */
export async function countConnectedWhatsAppTenants(): Promise<{ connected: number; total: number }> {
  const [{ rows: connectedRows }, total] = await Promise.all([
    getPool().query<{ count: string }>(
      "SELECT count(DISTINCT tenant_id) AS count FROM whatsapp_accounts WHERE status = 'connected'",
    ),
    countAll("tenants"),
  ]);
  return { connected: Number(connectedRows[0]?.count ?? 0), total };
}

/** Platform-wide pending/queued/retrying notification count — no tenant filter. */
export async function countPendingNotificationsPlatformWide(): Promise<number> {
  return countAll("notifications", "delivery_status IN ('pending', 'queued', 'retrying')");
}

/** A live round-trip, not a cached flag — timed so the Dashboard can show real latency. */
export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await getPool().query("SELECT 1");
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

/**
 * Most recent system-actor audit_log entry, as a "last seen" proxy for cron
 * activity — there is no dedicated cron-run tracking table in this app.
 */
export async function getLastSystemActivityAt(): Promise<string | null> {
  const { rows } = await getPool().query<{ created_at: Date }>(
    "SELECT created_at FROM audit_log WHERE actor_type = 'system' ORDER BY created_at DESC LIMIT 1",
  );
  return rows[0] ? rows[0].created_at.toISOString() : null;
}

/** Expected interval (minutes) between runs — used only to flag staleness, not to schedule anything. */
export const CRON_JOB_CADENCES: Record<string, number> = {
  process_notifications: 15,
  daily_birthday_check: 24 * 60,
  event_reminders: 60,
  process_event_notifications: 15,
};

export interface CronJobHealth {
  job: string;
  lastRunAt: string | null;
  overdue: boolean;
}

/**
 * Ground truth for "is this cron job actually running", derived from the
 * cron.<job> audit_log entry every route in app/api/cron/* now writes on
 * every invocation (lib/cron/log-run.ts) — even when there was no work to
 * do, so a live job always has a fresh timestamp. `overdue` allows a 2x
 * grace window over the job's expected cadence before flagging it.
 */
export async function getCronJobHealth(): Promise<CronJobHealth[]> {
  const jobs = Object.keys(CRON_JOB_CADENCES);
  const { rows } = await getPool().query<{ action: string; last_run_at: Date }>(
    `SELECT action, max(created_at) AS last_run_at
     FROM audit_log
     WHERE action = ANY($1::text[])
     GROUP BY action`,
    [jobs.map((job) => `cron.${job}`)],
  );
  const lastRunByJob = new Map(rows.map((row) => [row.action.replace(/^cron\./, ""), row.last_run_at]));

  return jobs.map((job) => {
    const lastRunAt = lastRunByJob.get(job) ?? null;
    const cadenceMs = CRON_JOB_CADENCES[job] * 60_000;
    const overdue = !lastRunAt || Date.now() - lastRunAt.getTime() > cadenceMs * 2;
    return { job, lastRunAt: lastRunAt ? lastRunAt.toISOString() : null, overdue };
  });
}

export interface WhatsAppSendHealth {
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
  recentFailureCount: number;
}

/**
 * Derived from the notification.sent/notification.failed audit entries
 * lib/notifications/delivery.ts already writes on every terminal outcome —
 * no new table needed. Surfaces exactly the kind of Meta OAuth/permission
 * error that isn't visible anywhere else in the UI today.
 */
export async function getWhatsAppSendHealth(): Promise<WhatsAppSendHealth> {
  const [{ rows: successRows }, { rows: failureRows }, { rows: recentRows }] = await Promise.all([
    getPool().query<{ created_at: Date }>(
      `SELECT created_at FROM audit_log
       WHERE action = 'notification.sent' AND metadata->>'channel' = 'whatsapp'
       ORDER BY created_at DESC LIMIT 1`,
    ),
    getPool().query<{ created_at: Date; metadata: { failureReason?: string } }>(
      `SELECT created_at, metadata FROM audit_log
       WHERE action = 'notification.failed' AND metadata->>'channel' = 'whatsapp'
       ORDER BY created_at DESC LIMIT 1`,
    ),
    getPool().query<{ count: string }>(
      `SELECT count(*) AS count FROM audit_log
       WHERE action = 'notification.failed' AND metadata->>'channel' = 'whatsapp'
         AND created_at > now() - interval '24 hours'`,
    ),
  ]);

  return {
    lastSuccessAt: successRows[0] ? successRows[0].created_at.toISOString() : null,
    lastFailureAt: failureRows[0] ? failureRows[0].created_at.toISOString() : null,
    lastFailureReason: failureRows[0]?.metadata?.failureReason ?? null,
    recentFailureCount: Number(recentRows[0]?.count ?? 0),
  };
}

/**
 * Platform-wide count of notifications stuck past their retry backoff (which
 * tops out at 30 minutes — see lib/db/notifications.ts's computeRetryState)
 * — anything still `retrying` after `overdueMinutes` means the retry sweep
 * (the process-notifications cron) isn't reaching it.
 */
export async function countStuckRetryingNotifications(overdueMinutes = 60): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM notifications
     WHERE delivery_status = 'retrying' AND next_attempt_at < now() - ($1 || ' minutes')::interval`,
    [overdueMinutes],
  );
  return Number(rows[0]?.count ?? 0);
}
