import { NextRequest, NextResponse } from "next/server";
import { handlePhonePeWebhook } from "@/lib/payments/webhook-service";

interface RouteParams {
  params: Promise<{ tenantId: string }>;
}

/**
 * One webhook URL per tenant, mirroring app/api/webhooks/razorpay/[tenantId]/route.ts —
 * PhonePe webhooks are configured per-merchant in the PhonePe Business
 * Dashboard, and every temple has its own merchant account/credentials. The
 * raw body is read as text (never `req.json()` first) because the SHA256
 * signature is computed over the exact bytes PhonePe sent.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { tenantId } = await params;
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("authorization");

  const result = await handlePhonePeWebhook(tenantId, rawBody, signatureHeader);
  return NextResponse.json({ ok: result.status === 200 }, { status: result.status });
}
