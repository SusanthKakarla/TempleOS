import { getPool } from "./pool";
import type {
  EventNotification,
  EventNotificationDeliveryStatus,
  EventNotificationType,
} from "@/types/db";

/**
 * event_notifications no longer receives new rows — new/updated/cancelled
 * event announcements now enqueue through lib/db/event-announcements.ts into
 * the generic `notifications` table instead (same table/worker/retry/logging
 * pipeline every other notification type already used). What remains here is
 * the delivery engine for whatever historical rows are still pending/retrying
 * (the cron sweep in app/api/cron/process-event-notifications/route.ts).
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
