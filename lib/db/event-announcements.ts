import { getPool } from "./pool";
import { getTemplate, renderTemplate } from "./notification-templates";
import { formatEventDateTime } from "@/lib/whatsapp/templates";
import type { Event, SupportedLanguage, Tenant } from "@/types/db";

const LANGUAGES: SupportedLanguage[] = ["en", "te"];

export type EventAnnouncementType = "new_event" | "event_updated" | "event_cancelled" | "event_announcement";

/**
 * Bulk broadcast to eligible devotees for one event — mirrors
 * lib/db/festival-greetings.ts's enqueueFestivalGreeting (one INSERT...SELECT
 * per language) instead of looping the single-recipient engine.ts call
 * hundreds of times. Replaces lib/db/event-notifications.ts's
 * enqueueEventNotifications as the write path into the generic `notifications`
 * table/worker/retry/logging pipeline, so event announcements no longer need
 * their own table, worker, or retry-sweep cron.
 *
 * `requireEventNotificationsEnabled` preserves the two pre-existing, distinct
 * audiences rather than merging them: the automatic new/updated/cancelled
 * triggers have always required devotees to opt into event notifications
 * specifically (event_notifications_enabled), while the manual "Send
 * Announcement" button has always reached everyone WhatsApp-opted-in.
 * Unifying the send pipeline doesn't mean silently widening or narrowing who
 * either one already reaches.
 */
export async function enqueueEventAnnouncement(
  tenant: Tenant,
  event: Event,
  notificationType: EventAnnouncementType,
  requireEventNotificationsEnabled: boolean,
): Promise<string[]> {
  const insertedIds: string[] = [];
  const audienceFilter = requireEventNotificationsEnabled ? "AND d.event_notifications_enabled = true" : "";

  for (const language of LANGUAGES) {
    const template = await getTemplate(notificationType, "whatsapp", language);
    if (!template) continue;

    const { date, time } = formatEventDateTime(event, tenant.timezone, language);
    // event_announcement's wording never included a location line (see
    // lib/db/notification-templates.ts's seed comment) — preserved as-is.
    const eventLocationLine =
      notificationType !== "event_announcement" && event.location ? `\n📍 ${event.location}` : "";
    const vars = {
      templeName: tenant.name,
      eventTitle: event.title,
      eventDate: date,
      eventTime: time,
      eventLocationLine,
    };
    const message = renderTemplate(template.body, vars);
    const title = template.title ? renderTemplate(template.title, vars) : null;

    const { rows } = await getPool().query<{ id: string }>(
      `INSERT INTO notifications
         (tenant_id, recipient_devotee_id, notification_type, channel, category,
          title, message, language, metadata, media_id, delivery_status, next_attempt_at)
       SELECT $1, d.id, $2, 'whatsapp', 'announcement',
              $3, $4, $5, $6::jsonb, $7, 'pending', now()
       FROM devotees d
       WHERE d.tenant_id = $1
         AND d.whatsapp_opt_in_status = true
         AND COALESCE(d.preferred_language, 'en') = $5
         ${audienceFilter}
       RETURNING id`,
      [tenant.id, notificationType, title, message, language, JSON.stringify({ eventId: event.id, ...vars }), event.bannerMediaId],
    );
    insertedIds.push(...rows.map((r) => r.id));
  }

  return insertedIds;
}
