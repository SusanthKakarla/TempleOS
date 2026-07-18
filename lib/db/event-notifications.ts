import { getPool } from "./pool";
import type {
  EventNotification,
  EventNotificationDeliveryStatus,
  EventNotificationType,
} from "@/types/db";

interface EventNotificationRow {
  id: string;
  tenant_id: string;
  event_id: string;
  devotee_id: string;
  whatsapp_message_id: string | null;
  notification_type: EventNotificationType;
  delivery_status: EventNotificationDeliveryStatus;
  attempt_count: number;
  next_attempt_at: Date;
  sent_at: Date | null;
  delivered_at: Date | null;
  read_at: Date | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapEventNotification(row: EventNotificationRow): EventNotification {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    devoteeId: row.devotee_id,
    whatsappMessageId: row.whatsapp_message_id,
    notificationType: row.notification_type,
    deliveryStatus: row.delivery_status,
    attemptCount: row.attempt_count,
    nextAttemptAt: row.next_attempt_at.toISOString(),
    sentAt: row.sent_at ? row.sent_at.toISOString() : null,
    deliveredAt: row.delivered_at ? row.delivered_at.toISOString() : null,
    readAt: row.read_at ? row.read_at.toISOString() : null,
    failureReason: row.failure_reason,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** One row per eligible devotee (opted in to WhatsApp AND event notifications). */
export async function enqueueEventNotifications(
  tenantId: string,
  eventId: string,
  notificationType: EventNotificationType,
): Promise<string[]> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO event_notifications (tenant_id, event_id, devotee_id, notification_type, delivery_status, next_attempt_at)
     SELECT $1, $2, d.id, $3, 'pending', now()
     FROM devotees d
     WHERE d.tenant_id = $1 AND d.whatsapp_opt_in_status = true AND d.event_notifications_enabled = true
     RETURNING id`,
    [tenantId, eventId, notificationType],
  );
  return rows.map((r) => r.id);
}

/**
 * NOT tenant-scoped — the one deliberate exception in lib/db/*, called only
 * by the cron sweep (app/api/cron/process-event-notifications/route.ts),
 * which runs outside any admin session and must process every tenant. Auth
 * is CRON_SECRET at the route, not a tenantId param.
 */
export async function listDueEventNotifications(limit: number): Promise<EventNotificationRow[]> {
  const { rows } = await getPool().query<EventNotificationRow>(
    `SELECT * FROM event_notifications
     WHERE delivery_status IN ('pending', 'retrying') AND next_attempt_at <= now()
     ORDER BY next_attempt_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

/**
 * Atomic claim — prevents after() (fired right after enqueue) and the cron
 * sweep from racing to process the same row. Returns null if another worker
 * already claimed it, or it's not actually due yet.
 */
export async function claimEventNotification(id: string): Promise<EventNotification | null> {
  const { rows } = await getPool().query<EventNotificationRow>(
    `UPDATE event_notifications SET delivery_status = 'queued', updated_at = now()
     WHERE id = $1 AND delivery_status IN ('pending', 'retrying') AND next_attempt_at <= now()
     RETURNING *`,
    [id],
  );
  return rows[0] ? mapEventNotification(rows[0]) : null;
}

export async function markEventNotificationSent(id: string, whatsappMessageId: string): Promise<void> {
  await getPool().query(
    `UPDATE event_notifications
     SET delivery_status = 'sent', sent_at = now(), whatsapp_message_id = $2, updated_at = now()
     WHERE id = $1`,
    [id, whatsappMessageId],
  );
}

const BACKOFF_MINUTES = [1, 5, 30]; // 3 retries after the first failed attempt = 4 attempts total

/** Pure — unit tested directly, no DB. */
export function computeRetryState(attemptCountAfterFailure: number): {
  deliveryStatus: "retrying" | "failed";
  nextAttemptAt: Date | null;
} {
  const idx = attemptCountAfterFailure - 1;
  return idx < BACKOFF_MINUTES.length
    ? { deliveryStatus: "retrying", nextAttemptAt: new Date(Date.now() + BACKOFF_MINUTES[idx] * 60_000) }
    : { deliveryStatus: "failed", nextAttemptAt: null };
}

export async function markEventNotificationFailed(
  id: string,
  attemptCountBefore: number,
  reason: string,
): Promise<void> {
  const attemptCount = attemptCountBefore + 1;
  const { deliveryStatus, nextAttemptAt } = computeRetryState(attemptCount);
  await getPool().query(
    `UPDATE event_notifications
     SET attempt_count = $2, failure_reason = $3, delivery_status = $4,
         next_attempt_at = COALESCE($5, next_attempt_at), updated_at = now()
     WHERE id = $1`,
    [id, attemptCount, reason, deliveryStatus, nextAttemptAt],
  );
}

/** Resend action — resets only currently-failed rows for one event. */
export async function resendFailedEventNotifications(tenantId: string, eventId: string): Promise<string[]> {
  const { rows } = await getPool().query<{ id: string }>(
    `UPDATE event_notifications
     SET delivery_status = 'pending', attempt_count = 0, next_attempt_at = now(), failure_reason = NULL, updated_at = now()
     WHERE tenant_id = $1 AND event_id = $2 AND delivery_status = 'failed'
     RETURNING id`,
    [tenantId, eventId],
  );
  return rows.map((r) => r.id);
}

export interface EventNotificationSummary {
  sent: number;
  failed: number;
  pending: number;
  total: number;
}

export async function getEventNotificationSummary(tenantId: string): Promise<EventNotificationSummary> {
  const { rows } = await getPool().query<{ delivery_status: EventNotificationDeliveryStatus; count: string }>(
    `SELECT delivery_status, count(*) FROM event_notifications WHERE tenant_id = $1 GROUP BY delivery_status`,
    [tenantId],
  );

  const summary: EventNotificationSummary = { sent: 0, failed: 0, pending: 0, total: 0 };
  for (const row of rows) {
    const count = Number(row.count);
    summary.total += count;
    if (row.delivery_status === "sent" || row.delivery_status === "delivered") summary.sent += count;
    else if (row.delivery_status === "failed") summary.failed += count;
    else summary.pending += count; // pending, queued, retrying
  }
  return summary;
}

export interface EventNotificationListItem extends EventNotification {
  eventTitle: string;
  devoteeName: string;
}

export async function listRecentEventNotifications(
  tenantId: string,
  opts: { eventId?: string; limit?: number } = {},
): Promise<EventNotificationListItem[]> {
  const conditions = ["n.tenant_id = $1"];
  const params: unknown[] = [tenantId];

  if (opts.eventId) {
    params.push(opts.eventId);
    conditions.push(`n.event_id = $${params.length}`);
  }
  params.push(opts.limit ?? 50);

  const { rows } = await getPool().query<EventNotificationRow & { event_title: string; devotee_name: string }>(
    `SELECT n.*, e.title AS event_title, d.display_name AS devotee_name
     FROM event_notifications n
     JOIN events e ON e.id = n.event_id
     JOIN devotees d ON d.id = n.devotee_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY n.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows.map((row) => ({
    ...mapEventNotification(row),
    eventTitle: row.event_title,
    devoteeName: row.devotee_name,
  }));
}

export async function listEventNotificationsForEvent(
  tenantId: string,
  eventId: string,
): Promise<EventNotification[]> {
  const { rows } = await getPool().query<EventNotificationRow>(
    `SELECT * FROM event_notifications WHERE tenant_id = $1 AND event_id = $2 ORDER BY created_at DESC`,
    [tenantId, eventId],
  );
  return rows.map(mapEventNotification);
}
