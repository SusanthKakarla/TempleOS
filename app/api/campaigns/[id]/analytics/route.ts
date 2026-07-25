import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getCampaignById } from "@/lib/db/campaigns";
import { getCampaignDeliverySummary, getCampaignDonationSummary, listCampaignDonations } from "@/lib/db/campaign-analytics";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Every number here is a read-only aggregate over existing tables (notifications, donations) — nothing is stored per-campaign beyond the campaign_id tag. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const campaign = await getCampaignById(session.tenantId, id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const delivery = await getCampaignDeliverySummary(session.tenantId, id);
  const donation = campaign.linkedDonationPurpose
    ? await getCampaignDonationSummary(session.tenantId, campaign.linkedDonationPurpose)
    : null;
  const donations = campaign.linkedDonationPurpose
    ? await listCampaignDonations(session.tenantId, campaign.linkedDonationPurpose)
    : [];

  return NextResponse.json({ delivery, donation, donations });
}
