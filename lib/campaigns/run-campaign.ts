import { enqueueCampaignBroadcast } from "@/lib/db/campaign-broadcasts";
import { processNotifications } from "@/lib/notifications/delivery";
import { updateCampaignStatus } from "@/lib/db/campaigns";
import { getCampaignDeliverySummary } from "@/lib/db/campaign-analytics";
import { isDonationCampaignReady } from "./donation-message";
import { computeNextRunAt } from "./recurrence";
import type { Campaign, Tenant } from "@/types/db";

export type RunCampaignResult =
  | { ok: true; sent: number; failed: number; recipients: number }
  | { ok: false; reason: "unsupported_audience" | "no_content" };

/**
 * The one place a campaign actually turns into notification rows and gets
 * drained — called from both the "Send Now" API route (immediate,
 * synchronous, so the admin sees real sent/failed counts right away) and
 * the campaign scheduler cron (promoting a due scheduled/recurring
 * campaign). Neither caller talks to WhatsApp directly; both go through
 * the existing enqueue → notifications table → delivery engine pipeline.
 */
export async function runCampaignNow(tenant: Tenant, campaign: Campaign): Promise<RunCampaignResult> {
  // A donation campaign with goal/dates/linked-purpose set has real content
  // via the rich donation_campaign_broadcast template even with neither
  // templateKey nor customMessage set — see enqueueCampaignBroadcast.
  if (!campaign.templateKey && !campaign.customMessage && !isDonationCampaignReady(campaign)) {
    return { ok: false, reason: "no_content" };
  }

  const insertedIds = await enqueueCampaignBroadcast(tenant, campaign);
  if (insertedIds === null) {
    return { ok: false, reason: "unsupported_audience" };
  }

  await updateCampaignStatus(tenant.id, campaign.id, "running", { lastRunAt: new Date().toISOString() });
  await processNotifications(insertedIds);

  const summary = await getCampaignDeliverySummary(tenant.id, campaign.id);

  if (campaign.scheduleType === "recurring" && campaign.recurrenceRule) {
    const nextRunAt = computeNextRunAt(campaign.recurrenceRule, new Date());
    await updateCampaignStatus(tenant.id, campaign.id, "scheduled", { nextRunAt: nextRunAt?.toISOString() ?? null });
  } else {
    await updateCampaignStatus(tenant.id, campaign.id, "completed", { nextRunAt: null });
  }

  return { ok: true, sent: summary.sent, failed: summary.failed, recipients: summary.recipients };
}
