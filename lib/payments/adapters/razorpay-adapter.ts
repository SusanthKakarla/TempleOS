import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import type {
  CreateOrderInput,
  CreateOrderResult,
  DecryptedCredentials,
  PaymentProviderAdapter,
  PaymentWebhookEvent,
  PaymentWebhookEventType,
  VerifyCheckoutSignatureInput,
} from "../provider";

/**
 * Signatures are verified by hand (HMAC-SHA256 + timingSafeEqual) rather than
 * via the `razorpay` package's own `Razorpay.validateWebhookSignature`/
 * `validatePaymentVerification` helpers — those compare with a plain `===`,
 * which is not constant-time and reintroduces the exact timing-attack class
 * this codebase's one real precedent (lib/auth/session-token.ts) already
 * guards against.
 */
function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const EVENT_TYPE_MAP: Record<string, PaymentWebhookEventType> = {
  "payment.authorized": "payment.authorized",
  "payment.captured": "payment.captured",
  "payment.failed": "payment.failed",
  "refund.processed": "refund.processed",
};

interface RazorpayWebhookEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  payment_id?: string;
}

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayWebhookEntity };
    refund?: { entity?: RazorpayWebhookEntity };
  };
}

export const razorpayAdapter: PaymentProviderAdapter = {
  key: "razorpay",

  async validateCredentials(creds: DecryptedCredentials) {
    try {
      const client = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
      await client.orders.all({ count: 1 });
      return { ok: true } as const;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not verify Razorpay credentials";
      return { ok: false, error: message } as const;
    }
  },

  async createOrder(creds: DecryptedCredentials, input: CreateOrderInput): Promise<CreateOrderResult> {
    const client = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
    const order = await client.orders.create({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receiptRef.slice(0, 40),
      notes: input.notes,
    });
    return { providerOrderId: order.id };
  },

  verifyCheckoutSignature(creds: DecryptedCredentials, input: VerifyCheckoutSignatureInput): boolean {
    const payload = `${input.providerOrderId}|${input.providerPaymentId}`;
    return safeEqual(hmacHex(creds.keySecret, payload), input.signature);
  },

  verifyWebhookSignature(creds: DecryptedCredentials, rawBody: string, signatureHeader: string): boolean {
    if (!creds.webhookSecret) return false;
    return safeEqual(hmacHex(creds.webhookSecret, rawBody), signatureHeader);
  },

  parseWebhookEvent(rawBody: string): PaymentWebhookEvent {
    let parsed: RazorpayWebhookPayload;
    try {
      parsed = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      return { type: null, providerOrderId: null, providerPaymentId: null, providerRefundId: null, amountPaise: null };
    }

    const type = parsed.event ? (EVENT_TYPE_MAP[parsed.event] ?? null) : null;
    const paymentEntity = parsed.payload?.payment?.entity;
    const refundEntity = parsed.payload?.refund?.entity;

    return {
      type,
      providerOrderId: paymentEntity?.order_id ?? null,
      providerPaymentId: paymentEntity?.id ?? refundEntity?.payment_id ?? null,
      providerRefundId: refundEntity?.id ?? null,
      amountPaise: paymentEntity?.amount ?? refundEntity?.amount ?? null,
    };
  },
};
