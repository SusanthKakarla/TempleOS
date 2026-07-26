import { NextRequest, NextResponse } from "next/server";
import {
  listDueCampaigns,
  listCampaignsNeedingClosingReminder,
  listCampaignsReachingGoal,
  markClosingReminderSent,
  markTargetReachedAnnounced,
} from "@/lib/db/campaigns";
import { getTenantById } from "@/lib/db/tenants";
import { runCampaignNow } from "@/lib/campaigns/run-campaign";
import { enqueueCampaignBroadcast } from "@/lib/db/campaign-broadcasts";
import { processNotifications } from "@/lib/notifications/delivery";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/log-run";

const BATCH_LIMIT = 50;

/**
 * Not tenant/session-scoped — triggered by Railway Cron, same as
 * process-notifications. Its ENTIRE job is deciding whether a scheduled or
 * recurring campaign is due (or, for donation campaigns, whether a closing
 * reminder or target-reached announcement is due); the actual send/retry/
 * delivery-status work is runCampaignNow/enqueueCampaignBroadcast → the
 * existing notification engine, completely unchanged. A tenant whose status
 * isn't "active" is skipped for this tick rather than failing the whole
 * sweep, matching lib/notifications/engine.ts's guard.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await listDueCampaigns(BATCH_LIMIT);
  let processed = 0;
  for (const campaign of due) {
    const tenant = await getTenantById(campaign.tenantId);
    if (!tenant || tenant.status !== "active") continue;
    await runCampaignNow(tenant, campaign);
    processed += 1;
  }

  // Closing reminder and target-reached announcement reuse the exact same
  // donation_campaign_broadcast render as the original send (it already
  // carries the campaign's end date and live raised/goal% — a natural
  // "closing soon"/"goal met" cue), rather than a separate message variant.
  // Each fires at most once per campaign, gated by its own timestamp column.
  const closingReminders = await listCampaignsNeedingClosingReminder(BATCH_LIMIT);
  let remindersSent = 0;
  for (const campaign of closingReminders) {
    const tenant = await getTenantById(campaign.tenantId);
    if (!tenant || tenant.status !== "active") continue;
    const insertedIds = await enqueueCampaignBroadcast(tenant, campaign);
    if (insertedIds) await processNotifications(insertedIds);
    await markClosingReminderSent(campaign.tenantId, campaign.id);
    remindersSent += 1;
  }

  const targetReached = await listCampaignsReachingGoal(BATCH_LIMIT);
  let targetAnnouncementsSent = 0;
  for (const campaign of targetReached) {
    const tenant = await getTenantById(campaign.tenantId);
    if (!tenant || tenant.status !== "active") continue;
    const insertedIds = await enqueueCampaignBroadcast(tenant, campaign);
    if (insertedIds) await processNotifications(insertedIds);
    await markTargetReachedAnnounced(campaign.tenantId, campaign.id);
    targetAnnouncementsSent += 1;
  }

  await logCronRun("process_campaign_schedules", {
    processed,
    found: due.length,
    remindersSent,
    targetAnnouncementsSent,
  });
  return NextResponse.json({ processed, remindersSent, targetAnnouncementsSent });
}
