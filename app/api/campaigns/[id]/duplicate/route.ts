import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getCampaignById, createCampaign } from "@/lib/db/campaigns";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Always duplicates into a fresh draft, regardless of the source campaign's own status — never copies delivery history. */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const source = await getCampaignById(session.tenantId, id);
  if (!source) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const campaign = await createCampaign(session.tenantId, {
    title: `${source.title} (Copy)`,
    description: source.description,
    campaignType: source.campaignType,
    channel: source.channel,
    templateKey: source.templateKey,
    audienceFilter: source.audienceFilter,
    bannerMediaId: source.bannerMediaId,
    linkedEventId: source.linkedEventId,
    scheduleType: source.scheduleType,
    scheduledAt: null,
    recurrenceRule: source.recurrenceRule,
    goalAmount: source.goalAmount,
    campaignStartDate: source.campaignStartDate,
    campaignEndDate: source.campaignEndDate,
    createdBy: session.membershipId,
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
