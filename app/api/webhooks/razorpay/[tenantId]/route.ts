import { NextRequest, NextResponse } from "next/server";
import { handleRazorpayWebhook } from "@/lib/payments/webhook-service";

interface RouteParams {
  params: Promise<{ tenantId: string }>;
}

/**
 * One webhook URL per tenant (Razorpay webhooks are configured per Razorpay
 * account, and every temple has its own account/keys) — the tenant is known
 * from the path before any signature verification is attempted, so there is
 * no need to brute-force every tenant's webhook secret against an incoming
 * request. The raw body is read as text (never `req.json()` first) because
 * the HMAC signature is computed over the exact bytes Razorpay sent.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { tenantId } = await params;
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-razorpay-signature");

  const result = await handleRazorpayWebhook(tenantId, rawBody, signatureHeader);
  return NextResponse.json({ ok: result.status === 200 }, { status: result.status });
}
