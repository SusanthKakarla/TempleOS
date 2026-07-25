import { NextRequest, NextResponse } from "next/server";
import { listDueCampaigns } from "@/lib/db/campaigns";
import { getTenantById } from "@/lib/db/tenants";
import { runCampaignNow } from "@/lib/campaigns/run-campaign";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/log-run";

const BATCH_LIMIT = 50;

/**
 * Not tenant/session-scoped — triggered by Railway Cron, same as
 * process-notifications. Its ENTIRE job is deciding whether a scheduled or
 * recurring campaign is due; the actual send/retry/delivery-status work is
 * runCampaignNow → the existing notification engine, completely unchanged.
 * A tenant whose status isn't "active" is skipped for this tick rather than
 * failing the whole sweep, matching lib/notifications/engine.ts's guard.
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

  await logCronRun("process_campaign_schedules", { processed, found: due.length });
  return NextResponse.json({ processed });
}
