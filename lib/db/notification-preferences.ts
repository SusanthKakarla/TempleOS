import { getPool } from "./pool";
import type { NotificationPreference, NotificationType } from "@/types/db";

interface NotificationPreferenceRow {
  id: string;
  person_id: string;
  notification_type: NotificationType;
  in_app_enabled: boolean;
  whatsapp_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapPreference(row: NotificationPreferenceRow): NotificationPreference {
  return {
    id: row.id,
    personId: row.person_id,
    notificationType: row.notification_type,
    inAppEnabled: row.in_app_enabled,
    whatsappEnabled: row.whatsapp_enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** No row = both channels enabled (opt-out model, matching tenants.notify_on_new_event's convention). */
export async function getPreference(
  personId: string,
  notificationType: NotificationType,
): Promise<NotificationPreference | null> {
  const { rows } = await getPool().query<NotificationPreferenceRow>(
    `SELECT * FROM notification_preferences WHERE person_id = $1 AND notification_type = $2 LIMIT 1`,
    [personId, notificationType],
  );
  return rows[0] ? mapPreference(rows[0]) : null;
}

export async function listPreferencesForPerson(personId: string): Promise<NotificationPreference[]> {
  const { rows } = await getPool().query<NotificationPreferenceRow>(
    `SELECT * FROM notification_preferences WHERE person_id = $1 ORDER BY notification_type`,
    [personId],
  );
  return rows.map(mapPreference);
}

export async function upsertPreference(input: {
  personId: string;
  notificationType: NotificationType;
  inAppEnabled: boolean;
  whatsappEnabled: boolean;
}): Promise<NotificationPreference> {
  const { rows } = await getPool().query<NotificationPreferenceRow>(
    `INSERT INTO notification_preferences (person_id, notification_type, in_app_enabled, whatsapp_enabled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (person_id, notification_type)
     DO UPDATE SET in_app_enabled = EXCLUDED.in_app_enabled,
                   whatsapp_enabled = EXCLUDED.whatsapp_enabled,
                   updated_at = now()
     RETURNING *`,
    [input.personId, input.notificationType, input.inAppEnabled, input.whatsappEnabled],
  );
  return mapPreference(rows[0]);
}
