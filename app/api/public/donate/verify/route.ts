import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getPaymentTransactionById } from "@/lib/db/payment-transactions";
import { verifyCheckoutSignatureForAccount } from "@/lib/payments/payment-provider-service";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

const verifySchema = z.object({
  transactionId: z.string().uuid(),
  providerOrderId: z.string().min(1),
  providerPaymentId: z.string().min(1),
  signature: z.string().min(1),
});

/**
 * Fast client-side acknowledgement ONLY — shows "Thank you" immediately
 * without waiting for Razorpay's webhook. Never creates the donation/receipt
 * itself; the webhook (lib/payments/webhook-service.ts) remains the sole
 * authoritative trigger for those side effects, so a donor closing the tab
 * right after paying still gets a correctly recorded donation once the
 * webhook lands, and this route can never be used to fabricate a donation
 * without a real, signature-verified payment.
 */
export async function POST(req: NextRequest) {
  if (isRateLimited(`donate-verify:${getClientIp(req.headers)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  const transaction = await getPaymentTransactionById(parsed.data.transactionId);
  if (!transaction || transaction.providerOrderId !== parsed.data.providerOrderId) {
    return NextResponse.json({ verified: false }, { status: 404 });
  }

  const verified = await verifyCheckoutSignatureForAccount(
    transaction.tenantId,
    transaction.paymentAccountId,
    transaction.providerKey,
    {
      providerOrderId: parsed.data.providerOrderId,
      providerPaymentId: parsed.data.providerPaymentId,
      signature: parsed.data.signature,
    },
  );

  return NextResponse.json({ verified });
}
