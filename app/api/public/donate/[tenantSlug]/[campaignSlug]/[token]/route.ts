import { NextRequest, NextResponse } from "next/server";
import { donationCheckoutSchema } from "@/lib/validation/payments";
import { createCheckoutOrder } from "@/lib/payments/donation-checkout-service";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ tenantSlug: string; campaignSlug: string; token: string }>;
}

/**
 * Public, unauthenticated — re-validates everything server-side (tenant,
 * campaign, token, campaign status, connected provider) regardless of what
 * the donation page's client-side state believes. Never reveals which check
 * failed; a generic 404 covers every "this link isn't usable" case.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  if (isRateLimited(`donate-order:${getClientIp(req.headers)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { tenantSlug, campaignSlug, token } = await params;
  const json = await req.json().catch(() => null);
  const parsed = donationCheckoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  let result;
  try {
    result = await createCheckoutOrder(tenantSlug, campaignSlug, token, {
      amount: parsed.data.amount,
      donorName: parsed.data.donorName,
      donorPhone: parsed.data.donorPhone ?? null,
      donorEmail: parsed.data.donorEmail ?? null,
      donorPan: parsed.data.donorPan ?? null,
      donationMessage: parsed.data.donationMessage ?? null,
      isAnonymous: parsed.data.isAnonymous,
    });
  } catch (err) {
    // Distinct from "campaign/link unavailable" below: the campaign and
    // provider connection are fine, the order-creation call to the payment
    // provider itself failed (bad/expired keys, provider outage, etc).
    // Telling the donor "this link isn't available" here would blame the
    // wrong thing — full detail is logged server-side for diagnosis.
    console.error("[public-donate:create-order] Payment order creation failed", {
      tenantSlug,
      campaignSlug,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "We couldn't start your payment right now. Please try again in a moment." },
      { status: 502 },
    );
  }

  if (!result) {
    return NextResponse.json({ error: "This donation link isn't available." }, { status: 404 });
  }

  return NextResponse.json({
    orderId: result.providerOrderId,
    keyId: result.keyId,
    amount: result.transaction.amount,
    currency: result.currency,
    transactionId: result.transaction.id,
    providerKey: result.transaction.providerKey,
    redirectUrl: result.redirectUrl,
  });
}
