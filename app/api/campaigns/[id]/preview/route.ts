import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getCampaignById } from "@/lib/db/campaigns";
import { getTenantById } from "@/lib/db/tenants";
import { getCampaignDonationSummary } from "@/lib/db/campaign-analytics";
import { buildDonationCampaignVars, isDonationCampaignReady } from "@/lib/campaigns/donation-message";
import { getTemplate, renderTemplate } from "@/lib/db/notification-templates";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Read-only — renders the exact same donation_campaign_broadcast body (both
 * languages) that Send/the scheduler would actually produce, via the same
 * buildDonationCampaignVars() helper, so preview can never drift from what
 * gets sent. Only meaningful for a donation campaign with goal/dates/linked
 * purpose set; otherwise reports which of those is missing rather than
 * guessing at a generic preview.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const campaign = await getCampaignById(session.tenantId, id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  if (!isDonationCampaignReady(campaign)) {
    return NextResponse.json({
      ready: false,
      reason: "Set a goal amount, start date, end date, and linked donation purpose to preview the donation campaign message.",
    });
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const donationSummary = await getCampaignDonationSummary(session.tenantId, campaign.linkedDonationPurpose!);

  const previews: Record<string, string> = {};
  for (const language of ["en", "te"] as const) {
    const template = await getTemplate("donation_campaign_broadcast", campaign.channel, language);
    const { vars } = buildDonationCampaignVars(tenant, campaign, donationSummary, language);
    previews[language] = template ? renderTemplate(template.body, vars) : "";
  }

  return NextResponse.json({ ready: true, previews });
}
