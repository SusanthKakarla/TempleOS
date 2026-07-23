import { getPool } from "./pool";
import { getTemplate, renderTemplate } from "./notification-templates";
import type { SupportedLanguage } from "@/types/db";

const LANGUAGES: SupportedLanguage[] = ["en", "te"];

/**
 * Bulk broadcast to every opted-in devotee — mirrors
 * lib/db/event-notifications.ts's enqueueEventNotifications (one INSERT...SELECT
 * per eligible devotee) instead of looping the single-recipient engine.ts call
 * hundreds of times. Same eligibility rule as the generic engine's devotee
 * branch (lib/notifications/engine.ts's eligibleChannels): whatsapp opt-in
 * only, no separate per-type toggle exists for devotees.
 */
export async function enqueueFestivalGreeting(
  tenantId: string,
  templeName: string,
  mediaId: string,
  festivalName: string,
): Promise<string[]> {
  const insertedIds: string[] = [];

  for (const language of LANGUAGES) {
    const template = await getTemplate("festival_greeting", "whatsapp", language);
    if (!template) continue;

    const message = renderTemplate(template.body, { festivalName, templeName });
    const title = template.title ? renderTemplate(template.title, { festivalName, templeName }) : null;

    const { rows } = await getPool().query<{ id: string }>(
      `INSERT INTO notifications
         (tenant_id, recipient_devotee_id, notification_type, channel, category,
          title, message, language, metadata, media_id, delivery_status, next_attempt_at)
       SELECT $1, d.id, 'festival_greeting', 'whatsapp', 'festival',
              $2, $3, $4, $5::jsonb, $6, 'pending', now()
       FROM devotees d
       WHERE d.tenant_id = $1
         AND d.whatsapp_opt_in_status = true
         AND COALESCE(d.preferred_language, 'en') = $4
       RETURNING id`,
      [tenantId, title, message, language, JSON.stringify({ festivalName }), mediaId],
    );
    insertedIds.push(...rows.map((r) => r.id));
  }

  return insertedIds;
}
