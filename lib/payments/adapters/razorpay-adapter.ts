import { createHmac } from "node:crypto";
import Razorpay from "razorpay";
import { timingSafeEqualString } from "@/lib/timing-safe-equal";
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
 * Signatures are verified by hand (HMAC-SHA256 + timingSafeEqualString)
 * rather than via the `razorpay` package's own
 * `Razorpay.validateWebhookSignature`/`validatePaymentVerification` helpers —
 * those compare with a plain `===`, which is not constant-time and
 * reintroduces the exact timing-attack class the shared timing-safe helper
 * (lib/timing-safe-equal.ts) guards against everywhere else in this app.
 */
function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

const safeEqual = timingSafeEqualString;

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
 * Loose shape covering every way the `razorpay` package/axios underneath it
 * has been observed to reject a request:
 *  - `{ statusCode, error: { code, description, ... } }` — the SDK's own
 *    `normalizeError` (node_modules/razorpay/dist/api.js), used for any HTTP
 *    error response Razorpay's API actually sent back (401 bad key/secret,
 *    400 malformed request, etc).
 *  - A raw axios error (`{ message, code, response: { status, data: { error
 *    } } }`) — possible if something throws before/without going through
 *    normalizeError.
 *  - A plain `Error` (network failure, DNS lookup failure, timeout) — has
 *    `.message`/`.stack` but no `.response`/`.error` at all.
 * `validateCredentials` below logs and returns every field from all three
 * shapes rather than assuming only one, since which one actually shows up is
 * exactly what's under investigation when verification unexpectedly fails.
 */
interface RazorpayLikeError {
  message?: string;
  code?: string;
  stack?: string;
  statusCode?: number | string;
  error?: { code?: string; description?: string; [key: string]: unknown };
  response?: { status?: number; statusText?: string; data?: { error?: { description?: string } } };
}

function asRazorpayLikeError(err: unknown): RazorpayLikeError {
  return err && typeof err === "object" ? (err as RazorpayLikeError) : {};
}

function extractStatusCode(err: RazorpayLikeError): number | string | null {
  return err.statusCode ?? err.response?.status ?? null;
}

function extractRazorpayErrorPayload(err: RazorpayLikeError): RazorpayLikeError["error"] | null {
  return err.error ?? err.response?.data?.error ?? null;
}

/**
 * Checked in order of specificity so the most useful available message wins:
 * Razorpay's own description, then the raw response's, then a plain Error's
 * `.message` (covers network/timeout failures), then the response's HTTP
 * status text, only falling back to a generic message if truly nothing else
 * is available.
 */
function extractRazorpayErrorMessage(err: RazorpayLikeError, fallback = "Could not verify Razorpay credentials"): string {
  const razorpayError = extractRazorpayErrorPayload(err);
  if (razorpayError?.description) return razorpayError.description;
  if (err.message) return err.message;
  if (err.response?.statusText) return `Razorpay API error: ${err.response.statusText}`;
  const statusCode = extractStatusCode(err);
  if (statusCode) return `Razorpay API request failed with status ${statusCode}`;
  return fallback;
}

export const razorpayAdapter: PaymentProviderAdapter = {
  key: "razorpay",

  async validateCredentials(creds: DecryptedCredentials) {
    const keyId = creds.mode === "api_key" ? creds.keyId : null;
    const keySecretLength = creds.mode === "api_key" ? creds.keySecret.length : null;

    console.log("========== Razorpay Verification ==========");
    console.log("Provider:", "razorpay");
    console.log("Connection Mode:", creds.mode);
    console.log("Key ID:", keyId ?? "(not applicable — OAuth mode has no key_id)");
    console.log("Key Secret Length:", keySecretLength ?? "(not applicable — OAuth mode has no key_secret)");
    if (keyId) {
      console.log("Using Test Mode:", keyId.startsWith("rzp_test_"));
      console.log("Using Live Mode:", keyId.startsWith("rzp_live_"));
    }
    console.log("=============================================");

    try {
      const client = buildClient(creds);
      await client.orders.all({ count: 1 });
      console.log("Razorpay credentials verified successfully.");
      return { ok: true } as const;
    } catch (rawErr) {
      const err = asRazorpayLikeError(rawErr);
      console.error("========== Razorpay Verification Failed ==========");
      console.error("Message:", err.message);
      console.error("Status Code:", extractStatusCode(err));
      console.error("Error:", err.error);
      console.error("Response:", err.response);
      console.error("Stack:", err.stack);
      console.error("==================================================");

      return {
        ok: false,
        error: extractRazorpayErrorMessage(err),
        statusCode: extractStatusCode(err),
        response: err.response ?? null,
        razorpayError: extractRazorpayErrorPayload(err),
      } as const;
    }
  },

  async createOrder(creds: DecryptedCredentials, input: CreateOrderInput): Promise<CreateOrderResult> {
    const client = buildClient(creds);
    try {
      const order = await client.orders.create({
        amount: input.amountPaise,
        currency: input.currency,
        receipt: input.receiptRef.slice(0, 40),
        notes: input.notes,
      });
      return { providerOrderId: order.id };
    } catch (rawErr) {
      // A bad/expired key, a live/test mode mismatch, or a Razorpay-side
      // rejection all throw here — without this catch, the raw SDK error
      // (not a real Error instance, see the comment on RazorpayLikeError
      // above) propagates uncaught up through the donation checkout route,
      // producing an opaque 500 with no JSON body. The client then falls
      // back to a generic "this donation link isn't available" message,
      // which is actively misleading: the campaign/link is fine, the
      // payment order just failed to create. Log full diagnostic detail
      // here and re-throw a clean, safe-to-propagate Error instead.
      const err = asRazorpayLikeError(rawErr);
      console.error("[razorpay:create-order] Order creation failed", {
        message: err.message,
        statusCode: extractStatusCode(err),
        razorpayError: extractRazorpayErrorPayload(err),
      });
      throw new Error(extractRazorpayErrorMessage(err, "Could not create Razorpay order"));
    }
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
