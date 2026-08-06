import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/payments/oauth-handoff";
import { isPartnerOnboardingConfigured } from "@/lib/payments/phonepe-oauth-client";
import { PaymentAuditService } from "@/lib/payments/payment-audit";

/**
 * Prepared landing point for PhonePe Partner Onboarding — mirrors
 * app/api/payments/oauth/callback/route.ts's structure exactly, reusing
 * `verifyOAuthState` unmodified (already provider-generic). Unreachable
 * through the UI today by design: the tenant-facing "Connect PhonePe"
 * button still opens the manual credential dialog, since PhonePe has no
 * public Partner/OAuth API for it to redirect to yet (see
 * docs/EL10-PHONEPE-PARTNER-READINESS.md). Exists so that when PhonePe
 * grants Partner access, only this route's body needs replacing with a real
 * exchangeAuthorizationCode + linkPartnerPaymentAccountForTenant call —
 * everything else (donation flow, webhooks, receipts, notifications) is
 * already ready.
 */
export async function GET(req: NextRequest) {
  const settingsUrl = new URL("/dashboard/settings", req.nextUrl.origin);

  const state = req.nextUrl.searchParams.get("state");
  const statePayload = state ? verifyOAuthState(state) : null;
  if (!statePayload) {
    settingsUrl.searchParams.set("phonepe_oauth_error", "invalid_or_expired_state");
    return NextResponse.redirect(settingsUrl);
  }

  if (!isPartnerOnboardingConfigured()) {
    await PaymentAuditService.partnerOnboardingNotAvailable(statePayload.tenantId, statePayload.membershipId, "phonepe");
    settingsUrl.searchParams.set("phonepe_oauth_error", "not_available");
    return NextResponse.redirect(settingsUrl);
  }

  // Reached only once PhonePe grants real Partner API access and
  // PHONEPE_PLATFORM_CLIENT_ID/SECRET are configured — nothing beyond this
  // point exists yet, matching phonepe-oauth-client.ts's scaffold-only state.
  settingsUrl.searchParams.set("phonepe_oauth_error", "not_available");
  return NextResponse.redirect(settingsUrl);
}
