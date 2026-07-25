import { getPool } from "./pool";
import type { CampaignAudienceFilter } from "@/types/db";

/**
 * Translates an audience choice into a devotee-table condition — never a
 * separate audience/segment table. Every campaign audience is re-evaluated
 * against live devotee state at preview and at send time, so an opt-out or
 * new donor is always reflected, never a stale snapshot.
 *
 * Returns null for a filter type with no backing data source yet
 * (`event_attendees` — this codebase has no event RSVP/attendance table),
 * so callers can surface "not supported yet" instead of silently sending to
 * the wrong audience.
 */
export function buildDevoteeAudienceCondition(
  filter: CampaignAudienceFilter,
  startParamIndex: number,
): { sql: string; params: unknown[] } | null {
  switch (filter.type) {
    case "all":
    case "active":
    case "opted_in":
      return { sql: "", params: [] };
    case "donors":
      return { sql: "AND d.is_donor = true", params: [] };
    case "language":
      return { sql: `AND COALESCE(d.preferred_language, 'en') = $${startParamIndex}`, params: [filter.language] };
    case "family":
      return { sql: `AND d.family_id = $${startParamIndex}`, params: [filter.familyId] };
    case "event_attendees":
      return null;
  }
}

/** Live headcount for the Create/Edit Campaign form — no rows written. */
export async function previewCampaignAudienceCount(
  tenantId: string,
  filter: CampaignAudienceFilter,
): Promise<number | null> {
  const condition = buildDevoteeAudienceCondition(filter, 2);
  if (!condition) return null;

  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM devotees d
     WHERE d.tenant_id = $1 AND d.whatsapp_opt_in_status = true AND d.is_active = true ${condition.sql}`,
    [tenantId, ...condition.params],
  );
  return Number(rows[0]?.count ?? 0);
}
