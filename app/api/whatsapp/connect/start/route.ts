import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { createHandoffToken } from "@/lib/whatsapp/onboarding-handoff";

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const onboardingOrigin = process.env.WHATSAPP_ONBOARDING_ORIGIN;
  if (!onboardingOrigin) {
    return NextResponse.json(
      { error: "WhatsApp Embedded Signup is not configured" },
      { status: 500 },
    );
  }

  const host = firstHeaderHost(req.headers.get("x-forwarded-host")) ?? req.nextUrl.hostname;
  const protocol = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const returnUrl = `${protocol}://${host}/dashboard/chatbot-settings`;

  const handoffToken = createHandoffToken({
    tenantId: session.tenantId,
    membershipId: session.membershipId,
    returnUrl,
  });

  const onboardingUrl = `${onboardingOrigin}/whatsapp-onboarding?token=${encodeURIComponent(handoffToken)}`;
  return NextResponse.json({ onboardingUrl });
}

function firstHeaderHost(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}
