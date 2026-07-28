import { NextRequest, NextResponse } from "next/server";
import { handleRazorpayPartnerWebhook } from "@/lib/payments/webhook-service";

/**
 * One platform-level endpoint shared by every Partner-OAuth-connected
 * tenant (manual-mode tenants keep their own per-tenant URL at
 * `/api/webhooks/razorpay/[tenantId]`, unchanged). The raw body is read as
 * text, never `req.json()` first, since the HMAC signature is computed over
 * the exact bytes Razorpay sent — same discipline as the per-tenant route.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-razorpay-signature");

  const result = await handleRazorpayPartnerWebhook(rawBody, signatureHeader);
  return NextResponse.json({ ok: result.status === 200 }, { status: result.status });
}
