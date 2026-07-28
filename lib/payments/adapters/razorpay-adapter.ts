import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import type {
  CreateOrderInput,
  CreateOrderResult,
  DecryptedCredentials,
  FetchOrderPaymentResult,
  PaymentProviderAdapter,
  PaymentWebhookEvent,
  PaymentWebhookEventType,
  RefundPaymentInput,
  RefundPaymentResult,
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
  "refund.failed": "refund.failed",
  // Never fires today (this app uses Orders + Checkout.js, not Payment
  // Links) — mapped only so a future Payment Links flow wouldn't silently
  // fall through as an unrecognized event.
  "payment_link.paid": "payment.link.paid",
};

interface RazorpayWebhookEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  payment_id?: string;
}

interface RazorpayWebhookPayload {
  event?: string;
  account_id?: string;
  payload?: {
    payment?: { entity?: RazorpayWebhookEntity };
    refund?: { entity?: RazorpayWebhookEntity };
  };
}

/**
 * Chooses the Razorpay SDK client shape for whichever mode a tenant
 * connected with — `{ key_id, key_secret }` for manual, `{ oauthToken }` for
 * Partner OAuth (confirmed supported directly by the installed `razorpay`
 * package, node_modules/razorpay/dist/razorpay.js). Every existing adapter
 * method already calls through here, so neither one has any other code that
 * needs to know which mode a given tenant used.
 */
function buildClient(creds: DecryptedCredentials): Razorpay {
  if (creds.mode === "oauth") {
    return new Razorpay({ oauthToken: creds.accessToken });
  }
  return new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
}

/**
 * For OAuth-connected sub-merchants there is no tenant-owned `key_secret` to
 * sign checkout/webhook HMACs against — Razorpay's Partner docs point to the
 * Partner application's own `client_secret` instead (constant across every
 * sub-merchant onboarded through that app). Flagged in the plan as the one
 * assumption that cannot be verified without a live Partner application.
 */
function resolveSigningSecret(creds: DecryptedCredentials): string | null {
  if (creds.mode === "api_key") return creds.keySecret;
  return process.env.RAZORPAY_PARTNER_CLIENT_SECRET ?? null;
}

/**
 * The `razorpay` package's API layer never throws a real `Error` for
 * HTTP-level failures — it throws a plain object shaped
 * `{ statusCode, error: { code, description, ... } }` (confirmed by reading
 * node_modules/razorpay/dist/api.js's `normalizeError`). Checking only
 * `err instanceof Error` therefore missed the actual reason (e.g. "The api
 * key/secret provided is invalid") on every real API rejection, falling
 * through to a generic, unhelpful message instead.
 */
function extractRazorpayErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "error" in err) {
    const inner = (err as { error?: { description?: string } }).error;
    if (inner?.description) return inner.description;
  }
  if (err instanceof Error) return err.message;
  return "Could not verify Razorpay credentials";
}

export const razorpayAdapter: PaymentProviderAdapter = {
  key: "razorpay",

  async validateCredentials(creds: DecryptedCredentials) {
    try {
      const client = buildClient(creds);
      await client.orders.all({ count: 1 });
      return { ok: true } as const;
    } catch (err) {
      return { ok: false, error: extractRazorpayErrorMessage(err) } as const;
    }
  },

  async createOrder(creds: DecryptedCredentials, input: CreateOrderInput): Promise<CreateOrderResult> {
    const client = buildClient(creds);
    const order = await client.orders.create({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receiptRef.slice(0, 40),
      notes: input.notes,
    });
    return { providerOrderId: order.id };
  },

  verifyCheckoutSignature(creds: DecryptedCredentials, input: VerifyCheckoutSignatureInput): boolean {
    const secret = resolveSigningSecret(creds);
    if (!secret) return false;
    const payload = `${input.providerOrderId}|${input.providerPaymentId}`;
    return safeEqual(hmacHex(secret, payload), input.signature);
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
      return {
        type: null,
        providerOrderId: null,
        providerPaymentId: null,
        providerRefundId: null,
        amountPaise: null,
        providerAccountId: null,
      };
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
      providerAccountId: parsed.account_id ?? null,
    };
  },

  async refundPayment(creds: DecryptedCredentials, input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const client = buildClient(creds);
    const refund = await client.payments.refund(input.providerPaymentId, {
      amount: input.amountPaise,
      notes: input.notes,
    });
    return { providerRefundId: refund.id, status: refund.status };
  },

  async fetchOrderPayment(creds: DecryptedCredentials, providerOrderId: string): Promise<FetchOrderPaymentResult> {
    const client = buildClient(creds);
    const { items } = await client.orders.fetchPayments(providerOrderId);
    const captured = items.find((payment) => payment.status === "captured");
    return {
      capturedPaymentId: captured?.id ?? null,
      amountPaise: captured ? Number(captured.amount) : null,
    };
  },
};
