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
