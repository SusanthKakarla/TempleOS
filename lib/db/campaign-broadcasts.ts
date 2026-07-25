import { getPool } from "./pool";
import { getTemplate, renderTemplate } from "./notification-templates";
import { buildDevoteeAudienceCondition } from "./campaign-audience";
import type { Campaign, SupportedLanguage, Tenant } from "@/types/db";

const LANGUAGES: SupportedLanguage[] = ["en", "te"];

/**
 * The one bulk broadcast function for the whole Campaign module — mirrors
 * lib/db/event-announcements.ts's enqueueEventAnnouncement exactly (one
 * INSERT...SELECT per language into the shared `notifications` table,
 * tagged so it can be traced back and aggregated). No campaign-specific
 * delivery/retry/send code exists anywhere else; everything downstream of
 * this function is the existing notification engine, untouched.
 *
 * Returns null instead of an empty array when the campaign's audience
 * filter has no backing data source yet (event_attendees), so callers can
 * distinguish "sent to zero eligible devotees" from "this audience isn't
 * supported yet" — never silently falling back to a wider audience than
 * the admin picked.
 */
export async function enqueueCampaignBroadcast(tenant: Tenant, campaign: Campaign): Promise<string[] | null> {
  // The query below has 9 fixed positional params ($1-$9); any extra bind
  // param the audience condition needs starts at $10.
  const condition = buildDevoteeAudienceCondition(campaign.audienceFilter, 10);
  if (!condition) return null;

  const languages: SupportedLanguage[] =
    campaign.audienceFilter.type === "language" ? [campaign.audienceFilter.language] : LANGUAGES;
  const insertedIds: string[] = [];

  for (const language of languages) {
    let title: string | null;
    let message: string;

    if (campaign.templateKey) {
      const template = await getTemplate(campaign.templateKey, campaign.channel, language);
      if (!template) continue;
      const vars = {
        templeName: tenant.name,
        campaignTitle: campaign.title,
        message: campaign.customMessage ?? campaign.description ?? "",
      };
      message = renderTemplate(template.body, vars);
      title = template.title ? renderTemplate(template.title, vars) : null;
    } else if (campaign.customMessage) {
      message = campaign.customMessage;
      title = campaign.title;
    } else {
      continue; // Neither set — the API layer validates this before a campaign can leave draft.
    }

    // For the "language" audience filter, condition.sql adds a harmless
    // redundant restatement of the same $6 language equality the loop
    // already narrows to — kept simple rather than special-cased.
    const { rows } = await getPool().query<{ id: string }>(
      `INSERT INTO notifications
         (tenant_id, recipient_devotee_id, notification_type, channel, category,
          title, message, language, metadata, media_id, campaign_id, delivery_status, next_attempt_at)
       SELECT $1, d.id, $2, $3, 'campaign',
              $4, $5, $6::text, $7::jsonb, $8, $9, 'pending', now()
       FROM devotees d
       WHERE d.tenant_id = $1
         AND d.whatsapp_opt_in_status = true
         AND d.is_active = true
         AND COALESCE(d.preferred_language, 'en') = $6
         ${condition.sql}
       RETURNING id`,
      [
        tenant.id,
        "campaign_broadcast",
        campaign.channel,
        title,
        message,
        language,
        JSON.stringify({ campaignId: campaign.id }),
        campaign.bannerMediaId,
        campaign.id,
        ...condition.params,
      ],
    );
    insertedIds.push(...rows.map((r) => r.id));
  }

  return insertedIds;
}
