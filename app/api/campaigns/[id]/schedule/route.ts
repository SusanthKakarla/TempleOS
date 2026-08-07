import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getCampaignById, updateCampaign, updateCampaignStatus } from "@/lib/db/campaigns";
import { canTransitionCampaignStatus } from "@/lib/campaigns/lifecycle";
import { computeNextRunAt } from "@/lib/campaigns/recurrence";
import { isDonationCampaignReady } from "@/lib/campaigns/donation-message";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const scheduleSchema = z.object({
  scheduledAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Must be a valid date/time")
    .refine((value) => Date.parse(value) > Date.now(), "Scheduled time must be in the future")
    .optional(),
  recurrenceRule: z.enum(["daily", "weekly", "monthly"]).optional(),
});

/** draft/paused → scheduled, with next_run_at computed from either a one-time scheduledAt or a recurring cadence. The campaign scheduler cron (app/api/cron/process-campaign-schedules) is what actually promotes it when due — this route only sets the appointment. */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const existing = await getCampaignById(session.tenantId, id);
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!canTransitionCampaignStatus(existing.status, "scheduled")) {
    return NextResponse.json({ error: `Cannot schedule a campaign from "${existing.status}"` }, { status: 409 });
  }
  // Matches run-campaign.ts's content gate exactly — a donation-ready
  // campaign (goal/dates/purpose all set, the only path left now that the
  // "Message" field is gone) needs no separate template/custom message,
  // since it always sends the rich donation_campaign_broadcast template.
  if (!existing.templateKey && !existing.customMessage && !isDonationCampaignReady(existing)) {
    return NextResponse.json({ error: "Add a message or template before scheduling" }, { status: 422 });
  }

  const json = await req.json().catch(() => null);
  const parsed = scheduleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const scheduleType = existing.scheduleType;
  let nextRunAt: Date | null = null;
  if (scheduleType === "recurring") {
    const rule = parsed.data.recurrenceRule ?? existing.recurrenceRule;
    if (!rule) return NextResponse.json({ error: "A recurring campaign needs a recurrence rule" }, { status: 422 });
    nextRunAt = computeNextRunAt(rule, new Date());
    if (!nextRunAt) return NextResponse.json({ error: "Unrecognized recurrence rule" }, { status: 422 });
  } else {
    const scheduledAt = parsed.data.scheduledAt ?? existing.scheduledAt;
    if (!scheduledAt) return NextResponse.json({ error: "Pick a send time" }, { status: 422 });
    nextRunAt = new Date(scheduledAt);
  }

  if (parsed.data.scheduledAt || parsed.data.recurrenceRule) {
    await updateCampaign(session.tenantId, id, {
      scheduledAt: parsed.data.scheduledAt,
      recurrenceRule: parsed.data.recurrenceRule,
    });
  }

  const campaign = await updateCampaignStatus(session.tenantId, id, "scheduled", {
    nextRunAt: nextRunAt.toISOString(),
  });
  return NextResponse.json({ campaign });
}
