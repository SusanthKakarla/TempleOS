import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getCampaignById } from "@/lib/db/campaigns";
import { getTenantById } from "@/lib/db/tenants";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { runCampaignNow } from "@/lib/campaigns/run-campaign";
import { canTransitionCampaignStatus } from "@/lib/campaigns/lifecycle";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * "Send Now" — sends synchronously (like app/api/events/[id]/announce)
 * rather than deferring via `after()`, specifically so the response can
 * report real sent/failed counts instead of "queued, check back later".
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const campaign = await getCampaignById(session.tenantId, id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!canTransitionCampaignStatus(campaign.status, "running")) {
    return NextResponse.json({ error: `Cannot send a campaign from "${campaign.status}"` }, { status: 409 });
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  if (campaign.channel === "whatsapp") {
    const account = await getWhatsAppAccountByTenant(session.tenantId);
    if (!account || account.status !== "connected") {
      return NextResponse.json({ error: "Connect WhatsApp before sending a campaign" }, { status: 422 });
    }
  }

  const result = await runCampaignNow(tenant, campaign);
  if (!result.ok) {
    const message =
      result.reason === "unsupported_audience"
        ? "This audience type isn't supported yet"
        : "Add a message or template before sending";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  return NextResponse.json({ recipients: result.recipients, sent: result.sent, failed: result.failed });
}
