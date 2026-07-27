import { getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { logPaymentWebhook } from "@/lib/db/payment-webhook-logs";
import { verifyWebhookSignatureForAccount, parseWebhookEvent } from "./payment-provider-service";
import { applyPaymentEvent } from "./campaign-payment-service";
import type { PaymentWebhookEventType } from "./provider";

export type WebhookOutcome = { status: 200 } | { status: 400 } | { status: 404 };

const EVENT_TYPE_TO_STATUS: Record<PaymentWebhookEventType, "authorized" | "captured" | "failed" | "refunded"> = {
  "payment.authorized": "authorized",
  "payment.captured": "captured",
  "payment.failed": "failed",
  "refund.processed": "refunded",
};

/**
 * Every inbound hit is logged unconditionally (valid or not, recognized or
 * not) — the raw operational/security audit trail this class of endpoint
 * needs and the existing WhatsApp webhook never had. Tenant is already known
 * from the URL path (the route resolves `[tenantId]` before calling this),
 * so signature verification uses THAT tenant's own stored secret — never a
 * brute-force loop over every tenant's secret.
 */
export async function handleRazorpayWebhook(
  tenantId: string,
  rawBody: string,
  signatureHeader: string | null,
): Promise<WebhookOutcome> {
  const account = await getActivePaymentAccountForTenant(tenantId);
  if (!account || account.providerKey !== "razorpay") {
    // tenantId here is an unverified URL path segment — it may not even be a
    // real tenant row (garbage/probing traffic), so it must never be passed
    // to the log (payment_webhook_logs.tenant_id has a real FK to tenants).
    await logPaymentWebhook({
      tenantId: null,
      providerKey: "razorpay",
      signatureValid: false,
      eventType: null,
      rawBody,
      errorMessage: "No active Razorpay account for this tenant",
    });
    return { status: 404 };
  }

  if (!signatureHeader) {
    await logPaymentWebhook({
      tenantId,
      providerKey: "razorpay",
      signatureValid: false,
      eventType: null,
      rawBody,
      errorMessage: "Missing X-Razorpay-Signature header",
    });
    return { status: 400 };
  }

  const signatureValid = await verifyWebhookSignatureForAccount(account.id, "razorpay", rawBody, signatureHeader);
  const event = parseWebhookEvent("razorpay", rawBody);

  await logPaymentWebhook({
    tenantId,
    providerKey: "razorpay",
    signatureValid,
    eventType: event.type,
    rawBody,
    errorMessage: signatureValid ? null : "Signature verification failed",
  });

  if (!signatureValid) {
    return { status: 400 };
  }

  if (event.type && event.providerOrderId) {
    await applyPaymentEvent(account.id, event.providerOrderId, {
      type: EVENT_TYPE_TO_STATUS[event.type],
      providerPaymentId: event.providerPaymentId,
    });
  }

  return { status: 200 };
}
