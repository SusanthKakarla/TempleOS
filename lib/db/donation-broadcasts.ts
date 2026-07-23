import { getPool } from "./pool";
import { getTemplate, renderTemplate } from "./notification-templates";
import type { SupportedLanguage } from "@/types/db";

const LANGUAGES: SupportedLanguage[] = ["en", "te"];

/**
 * Bulk broadcast to every opted-in devotee when a donation is recorded —
 * mirrors lib/db/festival-greetings.ts's enqueueFestivalGreeting (one
 * INSERT...SELECT per language) instead of looping the single-recipient
 * engine.ts call hundreds of times. WhatsApp only: devotees have no in-app
 * dashboard access (see lib/notifications/engine.ts's eligibleChannels), so
 * there is no in-app leg for this broadcast. Deliberately generic wording
 * (no donor name or amount) — this notifies every devotee that a donation
 * happened, not who gave how much.
 */
export async function enqueueDonationRecordedBroadcast(tenantId: string, templeName: string): Promise<string[]> {
  const insertedIds: string[] = [];

  for (const language of LANGUAGES) {
    const template = await getTemplate("donation_recorded", "whatsapp", language);
    if (!template) continue;

    const message = renderTemplate(template.body, { templeName });
    const title = template.title ? renderTemplate(template.title, { templeName }) : null;

    const { rows } = await getPool().query<{ id: string }>(
      `INSERT INTO notifications
         (tenant_id, recipient_devotee_id, notification_type, channel, category,
          title, message, language, metadata, delivery_status, next_attempt_at)
       SELECT $1, d.id, 'donation_recorded', 'whatsapp', 'donation',
              $2, $3, $4, $5::jsonb, 'pending', now()
       FROM devotees d
       WHERE d.tenant_id = $1
         AND d.whatsapp_opt_in_status = true
         AND COALESCE(d.preferred_language, 'en') = $4
       RETURNING id`,
      [tenantId, title, message, language, JSON.stringify({ templeName })],
    );
    insertedIds.push(...rows.map((r) => r.id));
  }

  return insertedIds;
}
