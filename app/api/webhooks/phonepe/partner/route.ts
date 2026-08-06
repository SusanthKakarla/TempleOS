import { NextRequest, NextResponse } from "next/server";
import { handlePhonePePartnerWebhook } from "@/lib/payments/webhook-service";

/**
 * Prepared landing point for a future platform-wide PhonePe Partner webhook
 * — mirrors app/api/webhooks/razorpay/partner/route.ts's shape (a thin
 * route, all logic in webhook-service.ts). Always responds 501 today; see
 * handlePhonePePartnerWebhook's own doc comment and
 * docs/EL10-PHONEPE-PARTNER-READINESS.md for what changes once PhonePe
 * grants real Partner API access.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const result = await handlePhonePePartnerWebhook(rawBody);
  return NextResponse.json({ ok: false, error: "PhonePe Partner webhook is not yet available" }, { status: result.status });
}
