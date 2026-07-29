import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/payments/oauth-handoff";
import { exchangeAuthorizationCode } from "@/lib/payments/razorpay-oauth-client";
import { linkPartnerPaymentAccountForTenant, markPaymentAccountVerified } from "@/lib/db/tenant-payment-accounts";
import { PaymentAuditService } from "@/lib/payments/payment-audit";

/**
 * Public route — Razorpay redirects the temple admin's browser here directly
 * with `?code&state` (or `?error=...` if they declined). Never called from
 * our own client code, so there is no session cookie to rely on: the signed
 * `state` value (see lib/payments/oauth-handoff.ts) is what re-establishes
 * which tenant/admin started this connection.
 */
export async function GET(req: NextRequest) {
  const settingsUrl = new URL("/dashboard/settings", req.nextUrl.origin);

  const error = req.nextUrl.searchParams.get("error");
  if (error) {
    settingsUrl.searchParams.set("razorpay_oauth_error", error);
    return NextResponse.redirect(settingsUrl);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) {
    settingsUrl.searchParams.set("razorpay_oauth_error", "missing_code_or_state");
    return NextResponse.redirect(settingsUrl);
  }

  const statePayload = verifyOAuthState(state);
  if (!statePayload) {
    settingsUrl.searchParams.set("razorpay_oauth_error", "invalid_or_expired_state");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const host = firstHeaderHost(req.headers.get("x-forwarded-host")) ?? req.nextUrl.hostname;
    const protocol = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
    const redirectUri =
      process.env.RAZORPAY_PARTNER_REDIRECT_URI ?? `${protocol}://${host}/api/payments/oauth/callback`;

    const tokens = await exchangeAuthorizationCode(code, redirectUri);

    const account = await linkPartnerPaymentAccountForTenant(statePayload.tenantId, {
      providerKey: "razorpay",
      razorpayAccountId: tokens.razorpayAccountId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000),
      publicToken: tokens.publicToken,
    });

    // A successful OAuth token exchange is itself proof Razorpay accepted
    // the connection — record that now instead of leaving "Verification
    // status" stuck on "Verification pending" forever.
    await markPaymentAccountVerified(account.id);

    await PaymentAuditService.accountConnected(
      statePayload.tenantId,
      statePayload.membershipId,
      account.id,
      account.providerKey,
    );

    settingsUrl.searchParams.set("razorpay_oauth_connected", "1");
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    settingsUrl.searchParams.set(
      "razorpay_oauth_error",
      err instanceof Error ? err.message.slice(0, 200) : "connection_failed",
    );
    return NextResponse.redirect(settingsUrl);
  }
}

function firstHeaderHost(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}
