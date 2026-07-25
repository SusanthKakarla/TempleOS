import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { previewCampaignAudienceCount } from "@/lib/db/campaign-audience";
import { campaignAudienceFilterSchema } from "@/lib/validation/campaigns";

/** Live headcount only — no rows written, called on every audience-picker change in the Create/Edit form. */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = campaignAudienceFilterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid audience filter" }, { status: 400 });
  }

  const count = await previewCampaignAudienceCount(session.tenantId, parsed.data);
  if (count === null) {
    return NextResponse.json({ count: null, unsupported: true });
  }
  return NextResponse.json({ count, unsupported: false });
}
