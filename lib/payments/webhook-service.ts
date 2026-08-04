import {
  getActivePaymentAccountForTenant,
  getPaymentAccountByRazorpayAccountId,
} from "@/lib/db/tenant-payment-accounts";
import { logPaymentWebhook } from "@/lib/db/payment-webhook-logs";
import { verifyWebhookSignatureForAccount, parseWebhookEvent, verifyPartnerWebhookSignature } from "./payment-provider-service";
import { applyPaymentEvent, applyRefundEvent } from "./campaign-payment-service";
import type { PaymentWebhookEvent, PaymentWebhookEventType } from "./provider";

export type WebhookOutcome = { status: 200 } | { status: 400 } | { status: 404 };

/**
 * `payment.link.paid` is never emitted today (this app creates Orders +
 * Checkout.js, never Payment Links) but is mapped to "captured" semantics
 * for forward-compatibility, since a paid Payment Link is fundamentally a
 * captured payment.
 */
const PAYMENT_STATUS_EVENTS: Record<
  Extract<PaymentWebhookEventType, "payment.authorized" | "payment.captured" | "payment.link.paid" | "payment.failed">,
  "authorized" | "captured" | "failed"
> = {
  "payment.authorized": "authorized",
  "payment.captured": "captured",
  "payment.link.paid": "captured",
  "payment.failed": "failed",
};

const REFUND_STATUS_EVENTS: Record<Extract<PaymentWebhookEventType, "refund.processed" | "refund.failed">, "processed" | "failed"> = {
  "refund.processed": "processed",
  "refund.failed": "failed",
};

function isPaymentStatusEvent(type: PaymentWebhookEventType): type is keyof typeof PAYMENT_STATUS_EVENTS {
  return type in PAYMENT_STATUS_EVENTS;
}

function isRefundEvent(type: PaymentWebhookEventType): type is keyof typeof REFUND_STATUS_EVENTS {
  return type in REFUND_STATUS_EVENTS;
}

/** Shared by both the per-tenant (manual) and platform-level (partner) webhook routes — the one place a parsed event actually gets applied, once signature verification and tenant resolution have already happened. */
async function dispatchWebhookEvent(accountId: string, event: PaymentWebhookEvent): Promise<void> {
  if (event.type && isPaymentStatusEvent(event.type) && event.providerOrderId) {
    await applyPaymentEvent(accountId, event.providerOrderId, {
      type: PAYMENT_STATUS_EVENTS[event.type],
      providerPaymentId: event.providerPaymentId,
    });
  } else if (event.type && isRefundEvent(event.type) && event.providerPaymentId && event.providerRefundId) {
    await applyRefundEvent(
      accountId,
      event.providerPaymentId,
      event.providerRefundId,
      REFUND_STATUS_EVENTS[event.type],
      event.amountPaise,
    );
  }
}

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
  try {
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

    const signatureValid = await verifyWebhookSignatureForAccount(tenantId, account.id, "razorpay", rawBody, signatureHeader);
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

    await dispatchWebhookEvent(account.id, event);
    return { status: 200 };
  } catch (err) {
    // Every branch above logs unconditionally before returning — this is the
    // one path that wouldn't otherwise: an unexpected throw (e.g. a transient
    // decrypt/DB error) would previously bypass logPaymentWebhook entirely,
    // leaving a real webhook delivery attempt with zero trace in
    // payment_webhook_logs. tenantId is still an unverified path segment here
    // (see the 404 branch above), so it's only logged if it already resolved
    // to a real account.
    try {
      await logPaymentWebhook({
        tenantId: null,
        providerKey: "razorpay",
        signatureValid: false,
        eventType: null,
        rawBody,
        errorMessage: `Unhandled exception: ${err instanceof Error ? err.message : String(err)}`,
      });
    } catch {
      // best-effort — the original exception is already what matters here
    }
    return { status: 400 };
  }
}

/**
 * The one platform-level endpoint every Partner-OAuth-connected tenant
 * shares (manual-mode tenants keep their own per-tenant URL above). Verified
 * against the Partner application's own webhook secret — not any individual
 * tenant's — since Razorpay signs these with the Partner app's secret
 * regardless of which sub-merchant the event belongs to. The tenant itself
 * is only known AFTER parsing the (now-trusted) payload's `account_id`.
 */
export async function handleRazorpayPartnerWebhook(rawBody: string, signatureHeader: string | null): Promise<WebhookOutcome> {
  try {
    if (!signatureHeader) {
      await logPaymentWebhook({
        tenantId: null,
        providerKey: "razorpay",
        signatureValid: false,
        eventType: null,
        rawBody,
        errorMessage: "Missing X-Razorpay-Signature header",
      });
      return { status: 400 };
    }

    const signatureValid = verifyPartnerWebhookSignature(rawBody, signatureHeader);
    const event = parseWebhookEvent("razorpay", rawBody);
    const account = event.providerAccountId ? await getPaymentAccountByRazorpayAccountId(event.providerAccountId) : null;

    await logPaymentWebhook({
      tenantId: account?.tenantId ?? null,
      providerKey: "razorpay",
      signatureValid,
      eventType: event.type,
      rawBody,
      errorMessage: signatureValid ? (account ? null : "Unknown razorpay_account_id") : "Signature verification failed",
    });

    if (!signatureValid) {
      return { status: 400 };
    }
    if (!account) {
      return { status: 404 };
    }

    await dispatchWebhookEvent(account.id, event);
    return { status: 200 };
  } catch (err) {
    // Same rationale as handleRazorpayWebhook's catch — an unexpected throw
    // (e.g. a transient decrypt/DB error) would otherwise leave a real
    // delivery attempt with zero trace in payment_webhook_logs.
    try {
      await logPaymentWebhook({
        tenantId: null,
        providerKey: "razorpay",
        signatureValid: false,
        eventType: null,
        rawBody,
        errorMessage: `Unhandled exception: ${err instanceof Error ? err.message : String(err)}`,
      });
    } catch {
      // best-effort — the original exception is already what matters here
    }
    return { status: 400 };
  }
}
