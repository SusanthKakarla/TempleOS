import { getPool } from "./pool";
import type {
  EventNotification,
  EventNotificationDeliveryStatus,
  EventNotificationType,
} from "@/types/db";
import { computeOffset } from "@/lib/pagination";

/**
 * event_notifications no longer receives new rows — new/updated/cancelled
 * event announcements now enqueue through lib/db/event-announcements.ts into
 * the generic `notifications` table instead (same table/worker/retry/logging
 * pipeline every other notification type already used). What remains here
 * is intentionally kept alive for two purposes only: reading historical rows
 * (the Notifications page's legacy table, and the summary counts) and
 * retrying already-failed historical rows via the "Resend failed" action
 * (app/api/events/[id]/notifications/resend/route.ts) — both harmless,
 * self-limiting concerns now that the table is never written to for new
 * events.
 */

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

export interface ListRecentEventNotificationsOptions {
  eventId?: string;
  /** Legacy fixed-window param — a plain LIMIT with no OFFSET. Superseded by `page`/`pageSize` when `page` is set. */
  limit?: number;
  page?: number;
  pageSize?: number;
  sort?: "date" | "status";
  dir?: "asc" | "desc";
}

const NOTIFICATION_SORT_COLUMNS: Record<NonNullable<ListRecentEventNotificationsOptions["sort"]>, string> = {
  date: "n.created_at",
  status: "n.delivery_status",
};

export async function listRecentEventNotifications(
  tenantId: string,
  opts: ListRecentEventNotificationsOptions = {},
): Promise<EventNotificationListItem[]> {
  const conditions = ["n.tenant_id = $1"];
  const params: unknown[] = [tenantId];

  if (opts.eventId) {
    params.push(opts.eventId);
    conditions.push(`n.event_id = $${params.length}`);
  }

  const sortColumn = opts.sort ? NOTIFICATION_SORT_COLUMNS[opts.sort] : "n.created_at";
  const dir = opts.dir === "asc" ? "ASC" : "DESC";

  let query = `SELECT n.*, e.title AS event_title, d.display_name AS devotee_name
     FROM event_notifications n
     JOIN events e ON e.id = n.event_id
     JOIN devotees d ON d.id = n.devotee_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${sortColumn} ${dir}`;

  if (opts.page !== undefined) {
    const pageSize = opts.pageSize ?? 50;
    params.push(pageSize, computeOffset(opts.page, pageSize));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
  } else {
    params.push(opts.limit ?? 50);
    query += ` LIMIT $${params.length}`;
  }

  const { rows } = await getPool().query<EventNotificationRow & { event_title: string; devotee_name: string }>(
    query,
    params,
  );
  return rows.map((row) => ({
    ...mapEventNotification(row),
    eventTitle: row.event_title,
    devoteeName: row.devotee_name,
  }));
}

export async function countEventNotificationsFiltered(
  tenantId: string,
  opts: { eventId?: string } = {},
): Promise<number> {
  const conditions = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  if (opts.eventId) {
    params.push(opts.eventId);
    conditions.push(`event_id = $${params.length}`);
  }
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM event_notifications WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.count ?? 0);
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
