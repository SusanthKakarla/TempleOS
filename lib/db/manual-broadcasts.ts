import { getPool } from "./pool";

/**
 * Bulk broadcast of an admin-typed message to every WhatsApp-opted-in
 * devotee — mirrors lib/db/festival-greetings.ts's enqueueFestivalGreeting
 * (one INSERT...SELECT, same eligibility rule as the generic engine's
 * devotee branch: whatsapp opt-in + active, no separate per-type toggle).
 * Simpler than a festival greeting: the admin's own text *is* the message,
 * so there's no notification_templates lookup/render and no per-language
 * loop — one message, sent as-is to every eligible devotee.
 */
export async function enqueueTempleAnnouncement(tenantId: string, message: string): Promise<string[]> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO notifications
       (tenant_id, recipient_devotee_id, notification_type, channel, category,
        title, message, language, metadata, delivery_status, next_attempt_at)
     SELECT $1, d.id, 'temple_announcement', 'whatsapp', 'announcement',
            NULL, $2, COALESCE(d.preferred_language, 'en'), '{}'::jsonb, 'pending', now()
     FROM devotees d
     WHERE d.tenant_id = $1
       AND d.whatsapp_opt_in_status = true
       AND d.is_active = true
     RETURNING id`,
    [tenantId, message],
  );
  return rows.map((r) => r.id);
}
