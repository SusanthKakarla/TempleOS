import { getPool } from "./pool";
import type {
  Notification,
  NotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
  SupportedLanguage,
} from "@/types/db";
import { computeOffset } from "@/lib/pagination";

interface NotificationRow {
  id: string;
  tenant_id: string;
  recipient_person_id: string | null;
  recipient_devotee_id: string | null;
  notification_type: NotificationType;
  channel: NotificationChannel;
  category: NotificationCategory;
  title: string | null;
  message: string;
  language: SupportedLanguage;
  metadata: Record<string, unknown>;
  delivery_status: NotificationDeliveryStatus;
  attempt_count: number;
  next_attempt_at: Date;
  sent_at: Date | null;
  delivered_at: Date | null;
  read_at: Date | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    recipientPersonId: row.recipient_person_id,
    recipientDevoteeId: row.recipient_devotee_id,
    notificationType: row.notification_type,
    channel: row.channel,
    category: row.category,
    title: row.title,
    message: row.message,
    language: row.language,
    metadata: row.metadata,
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

export interface CreateNotificationInput {
  tenantId: string;
  recipientPersonId?: string;
  recipientDevoteeId?: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  category: NotificationCategory;
  title: string | null;
  message: string;
  language: SupportedLanguage;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const { rows } = await getPool().query<NotificationRow>(
    `INSERT INTO notifications
       (tenant_id, recipient_person_id, recipient_devotee_id, notification_type, channel, category,
        title, message, language, metadata, delivery_status, next_attempt_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 'pending', now())
     RETURNING *`,
    [
      input.tenantId,
      input.recipientPersonId ?? null,
      input.recipientDevoteeId ?? null,
      input.notificationType,
      input.channel,
      input.category,
      input.title,
      input.message,
      input.language,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return mapNotification(rows[0]);
}

/**
 * NOT tenant-scoped — the same deliberate exception as listDueEventNotifications
 * (lib/db/event-notifications.ts): called only by the cron sweep, which runs
 * outside any admin session and must process every tenant.
 */
export async function listDueNotifications(limit: number): Promise<Notification[]> {
  const { rows } = await getPool().query<NotificationRow>(
    `SELECT * FROM notifications
     WHERE delivery_status IN ('pending', 'retrying') AND next_attempt_at <= now()
     ORDER BY next_attempt_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows.map(mapNotification);
}

/** Atomic claim — prevents after() and the cron sweep from racing to process the same row. */
export async function claimNotification(id: string): Promise<Notification | null> {
  const { rows } = await getPool().query<NotificationRow>(
    `UPDATE notifications SET delivery_status = 'queued', updated_at = now()
     WHERE id = $1 AND delivery_status IN ('pending', 'retrying') AND next_attempt_at <= now()
     RETURNING *`,
    [id],
  );
  return rows[0] ? mapNotification(rows[0]) : null;
}

export async function markNotificationSent(id: string): Promise<void> {
  await getPool().query(
    `UPDATE notifications
     SET delivery_status = 'sent', sent_at = now(), updated_at = now()
     WHERE id = $1`,
    [id],
  );
}

const BACKOFF_MINUTES = [1, 5, 30]; // 3 retries after the first failed attempt = 4 attempts total

/** Pure — mirrors lib/db/event-notifications.ts's computeRetryState exactly. */
export function computeRetryState(attemptCountAfterFailure: number): {
  deliveryStatus: "retrying" | "failed";
  nextAttemptAt: Date | null;
} {
  const idx = attemptCountAfterFailure - 1;
  return idx < BACKOFF_MINUTES.length
    ? { deliveryStatus: "retrying", nextAttemptAt: new Date(Date.now() + BACKOFF_MINUTES[idx] * 60_000) }
    : { deliveryStatus: "failed", nextAttemptAt: null };
}

export async function markNotificationFailed(id: string, attemptCountBefore: number, reason: string): Promise<void> {
  const attemptCount = attemptCountBefore + 1;
  const { deliveryStatus, nextAttemptAt } = computeRetryState(attemptCount);
  await getPool().query(
    `UPDATE notifications
     SET attempt_count = $2, failure_reason = $3, delivery_status = $4,
         next_attempt_at = COALESCE($5, next_attempt_at), updated_at = now()
     WHERE id = $1`,
    [id, attemptCount, reason, deliveryStatus, nextAttemptAt],
  );
}

export interface ListNotificationsForRecipientOptions {
  category?: NotificationCategory;
  page?: number;
  pageSize?: number;
}

export async function listNotificationsForPerson(
  tenantId: string,
  personId: string,
  opts: ListNotificationsForRecipientOptions = {},
): Promise<Notification[]> {
  const conditions = ["tenant_id = $1", "recipient_person_id = $2"];
  const params: unknown[] = [tenantId, personId];

  if (opts.category) {
    params.push(opts.category);
    conditions.push(`category = $${params.length}`);
  }

  let query = `SELECT * FROM notifications WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;
  const pageSize = opts.pageSize ?? 50;
  params.push(pageSize, computeOffset(opts.page ?? 1, pageSize));
  query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const { rows } = await getPool().query<NotificationRow>(query, params);
  return rows.map(mapNotification);
}

export async function countUnreadNotificationsForPerson(tenantId: string, personId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM notifications
     WHERE tenant_id = $1 AND recipient_person_id = $2 AND read_at IS NULL AND channel = 'in_app'`,
    [tenantId, personId],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function markNotificationRead(id: string, personId: string): Promise<void> {
  await getPool().query(
    `UPDATE notifications SET read_at = now(), updated_at = now()
     WHERE id = $1 AND recipient_person_id = $2 AND read_at IS NULL`,
    [id, personId],
  );
}

export interface NotificationCategoryCounts {
  birthday: number;
  new_user: number;
  devotee: number;
  event: number;
  announcement: number;
  anniversary: number;
  family: number;
}

/** Tenant-wide counts (any recipient) for the Notification Center's category tabs. */
export async function countNotificationsByCategory(tenantId: string): Promise<NotificationCategoryCounts> {
  const { rows } = await getPool().query<{ category: NotificationCategory; count: string }>(
    `SELECT category, count(*) FROM notifications WHERE tenant_id = $1 GROUP BY category`,
    [tenantId],
  );
  const counts: NotificationCategoryCounts = {
    birthday: 0,
    new_user: 0,
    devotee: 0,
    event: 0,
    announcement: 0,
    anniversary: 0,
    family: 0,
  };
  for (const row of rows) {
    counts[row.category] = Number(row.count);
  }
  return counts;
}

/** Dashboard "Scheduled Notifications" card — every notification still awaiting delivery, any category. */
export async function countPendingNotifications(tenantId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM notifications
     WHERE tenant_id = $1 AND delivery_status IN ('pending', 'queued', 'retrying')`,
    [tenantId],
  );
  return Number(rows[0]?.count ?? 0);
}

/** Devotee detail page's "Notification History" — devotees have no in-app center, so this is read-only. */
export async function listNotificationsForDevotee(
  tenantId: string,
  devoteeId: string,
  limit = 10,
): Promise<Notification[]> {
  const { rows } = await getPool().query<NotificationRow>(
    `SELECT * FROM notifications
     WHERE tenant_id = $1 AND recipient_devotee_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [tenantId, devoteeId, limit],
  );
  return rows.map(mapNotification);
}

export async function countNotificationsFiltered(
  tenantId: string,
  opts: { category?: NotificationCategory } = {},
): Promise<number> {
  const conditions = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  if (opts.category) {
    params.push(opts.category);
    conditions.push(`category = $${params.length}`);
  }
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM notifications WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.count ?? 0);
}

export interface NotificationListItem extends Notification {
  recipientName: string;
}

/** Notification Center feed — joins in the recipient's display name for both person and devotee recipients. */
export async function listRecentNotifications(
  tenantId: string,
  opts: ListNotificationsForRecipientOptions = {},
): Promise<NotificationListItem[]> {
  const conditions = ["n.tenant_id = $1"];
  const params: unknown[] = [tenantId];

  if (opts.category) {
    params.push(opts.category);
    conditions.push(`n.category = $${params.length}`);
  }

  let query = `SELECT n.*, COALESCE(p.display_name, d.display_name) AS recipient_name
     FROM notifications n
     LEFT JOIN persons p ON p.id = n.recipient_person_id
     LEFT JOIN devotees d ON d.id = n.recipient_devotee_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY n.created_at DESC`;
  const pageSize = opts.pageSize ?? 50;
  params.push(pageSize, computeOffset(opts.page ?? 1, pageSize));
  query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const { rows } = await getPool().query<NotificationRow & { recipient_name: string }>(query, params);
  return rows.map((row) => ({ ...mapNotification(row), recipientName: row.recipient_name }));
}
