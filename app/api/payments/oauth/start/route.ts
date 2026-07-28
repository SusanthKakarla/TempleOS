import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { createOAuthState } from "@/lib/payments/oauth-handoff";
import { buildAuthorizeUrl, isPartnerOnboardingConfigured } from "@/lib/payments/razorpay-oauth-client";

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  if (!isPartnerOnboardingConfigured()) {
    return NextResponse.json({ error: "Razorpay Partner Onboarding is not configured" }, { status: 500 });
  }

  const host = firstHeaderHost(req.headers.get("x-forwarded-host")) ?? req.nextUrl.hostname;
  const protocol = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const redirectUri = process.env.RAZORPAY_PARTNER_REDIRECT_URI ?? `${protocol}://${host}/api/payments/oauth/callback`;

  const state = createOAuthState({ tenantId: session.tenantId, membershipId: session.membershipId });
  const authorizeUrl = buildAuthorizeUrl(state, redirectUri);
  return NextResponse.json({ authorizeUrl });
}

function firstHeaderHost(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}
