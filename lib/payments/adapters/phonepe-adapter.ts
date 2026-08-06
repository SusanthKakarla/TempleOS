import { createHash } from "node:crypto";
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
 * PhonePe's current (2026) Standard Checkout v2 API — verified live against
 * developer.phonepe.com, not guessed. Auth is OAuth2 client-credentials
 * (NOT the older X-VERIFY/salt-key checksum scheme, which is legacy and not
 * implemented here). All endpoints below were fetched directly from
 * PhonePe's own docs during this feature's research phase.
 */
function resolveEndpoints(environment: "sandbox" | "production") {
  if (environment === "sandbox") {
    return {
      tokenUrl: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
      payUrl: "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay",
      statusUrl: (merchantOrderId: string) =>
        `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`,
      refundUrl: "https://api-preprod.phonepe.com/apis/pg-sandbox/payments/v2/refund",
    };
  }
  return {
    tokenUrl: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    payUrl: "https://api.phonepe.com/apis/pg/checkout/v2/pay",
    statusUrl: (merchantOrderId: string) =>
      `https://api.phonepe.com/apis/pg/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`,
    refundUrl: "https://api.phonepe.com/apis/pg/payments/v2/refund",
  };
}

/** PhonePe issues merchants a client version number at onboarding time — in practice this is almost always "1" for a direct Standard Checkout integration. Hardcoded rather than adding a per-tenant column no merchant in this codebase has ever needed yet. */
const DEFAULT_CLIENT_VERSION = "1";

function requireApiKeyCreds(creds: DecryptedCredentials): Extract<DecryptedCredentials, { mode: "api_key" }> {
  if (creds.mode !== "api_key") {
    throw new Error("PhonePe only supports manual (Client ID/Client Secret) credentials, not OAuth-connected accounts");
  }
  return creds;
}

interface PhonePeTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_at?: number;
}

async function getAccessToken(creds: Extract<DecryptedCredentials, { mode: "api_key" }>): Promise<string> {
  const environment = creds.environment ?? "production";
  const { tokenUrl } = resolveEndpoints(environment);
  const body = new URLSearchParams({
    client_id: creds.keyId,
    client_secret: creds.keySecret,
    client_version: DEFAULT_CLIENT_VERSION,
    grant_type: "client_credentials",
  });
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await response.json().catch(() => ({}))) as PhonePeTokenResponse;
  if (!response.ok || !json.access_token) {
    throw new PhonePeApiError("Could not authenticate with PhonePe", response.status, json);
  }
  return json.access_token;
}

class PhonePeApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response: unknown,
  ) {
    super(message);
    this.name = "PhonePeApiError";
  }
}

function authHeaders(token: string, providerMerchantId: string | null | undefined): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `O-Bearer ${token}`,
  };
  if (providerMerchantId) headers["X-MERCHANT-ID"] = providerMerchantId;
  return headers;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

const EVENT_TYPE_MAP: Record<string, PaymentWebhookEventType> = {
  "checkout.order.completed": "payment.captured",
  "checkout.order.failed": "payment.failed",
  "pg.refund.completed": "refund.processed",
  "pg.refund.failed": "refund.failed",
};

interface PhonePeWebhookPayload {
  event?: string;
  payload?: {
    orderId?: string;
    merchantOrderId?: string;
    state?: string;
    amount?: number;
    errorCode?: string;
    paymentDetails?: { transactionId?: string; amount?: number }[];
    // Refund-event field names are the ones PhonePe's docs describe
    // ("merchantRefundId", "originalMerchantOrderId") but were not
    // confirmed against a live sandbox refund webhook during this feature's
    // research phase — verify these against a real payload before relying
    // on refund webhooks in production, and adjust if PhonePe's actual
    // field names differ.
    merchantRefundId?: string;
    refundId?: string;
    originalMerchantOrderId?: string;
  };
}

interface PhonePeStatusResponse {
  state?: "PENDING" | "COMPLETED" | "FAILED";
  amount?: number;
  paymentDetails?: { transactionId?: string; state?: string; amount?: number }[];
}

interface PhonePeErrorResponse {
  code?: string;
  message?: string;
}

export const phonepeAdapter: PaymentProviderAdapter = {
  key: "phonepe",

  async validateCredentials(creds: DecryptedCredentials) {
    try {
      const apiKeyCreds = requireApiKeyCreds(creds);
      await getAccessToken(apiKeyCreds);
      return { ok: true } as const;
    } catch (err) {
      const apiErr = err instanceof PhonePeApiError ? err : null;
      const errorBody = apiErr?.response as PhonePeErrorResponse | null;
      console.error("[phonepe:validate-credentials] Verification failed", {
        message: err instanceof Error ? err.message : String(err),
        statusCode: apiErr?.statusCode,
        response: apiErr?.response,
      });
      return {
        ok: false,
        error: errorBody?.message ?? (err instanceof Error ? err.message : "Could not verify PhonePe credentials"),
        statusCode: apiErr?.statusCode ?? null,
        response: apiErr?.response ?? null,
        razorpayError: errorBody ?? null,
      } as const;
    }
  },

  async createOrder(creds: DecryptedCredentials, input: CreateOrderInput): Promise<CreateOrderResult> {
    const apiKeyCreds = requireApiKeyCreds(creds);
    if (!input.redirectUrl) {
      throw new Error("PhonePe checkout requires a redirectUrl — none was provided");
    }
    const environment = apiKeyCreds.environment ?? "production";
    const { payUrl } = resolveEndpoints(environment);
    const token = await getAccessToken(apiKeyCreds);

    // PhonePe's create-order response returns its OWN internal orderId, but
    // this adapter stores and echoes back OUR merchantOrderId
    // (input.receiptRef) as providerOrderId instead — every later lookup
    // (Order Status, Refund) is keyed by merchantOrderId, not PhonePe's own
    // orderId, so this keeps payment_transactions.provider_order_id usable
    // for status/refund calls the same way it already is for Razorpay.
    const merchantOrderId = input.receiptRef;

    const response = await fetch(payUrl, {
      method: "POST",
      headers: authHeaders(token, apiKeyCreds.providerMerchantId),
      body: JSON.stringify({
        merchantOrderId,
        amount: input.amountPaise,
        expireAfter: 1200,
        paymentFlow: {
          type: "PG_CHECKOUT",
          merchantUrls: { redirectUrl: input.redirectUrl },
        },
        ...(input.notes && Object.keys(input.notes).length > 0
          ? { metaInfo: Object.fromEntries(Object.entries(input.notes).slice(0, 15).map(([k, v], i) => [`udf${i + 1}`, `${k}:${v}`.slice(0, 256)])) }
          : {}),
      }),
    });
    const json = (await response.json().catch(() => ({}))) as { redirectUrl?: string } & PhonePeErrorResponse;
    if (!response.ok || !json.redirectUrl) {
      console.error("[phonepe:create-order] Order creation failed", {
        statusCode: response.status,
        response: json,
      });
      throw new Error(json.message ?? "Could not create PhonePe order");
    }

    return { providerOrderId: merchantOrderId, redirectUrl: json.redirectUrl };
  },

  verifyCheckoutSignature(_creds: DecryptedCredentials, _input: VerifyCheckoutSignatureInput): boolean {
    // PhonePe's Standard Checkout is a redirect flow, not an in-page JS SDK
    // callback — there is no client-supplied signature to verify the way
    // Razorpay Checkout.js's handler payload has one. Completion is
    // confirmed authoritatively via the webhook (verifyWebhookSignature
    // below) and/or a server-side Order Status poll, never trusted from the
    // client. Always returns false so nothing downstream can mistake a
    // missing check for a passed one.
    return false;
  },

  verifyWebhookSignature(creds: DecryptedCredentials, rawBody: string, signatureHeader: string): boolean {
    // PhonePe's SHA (Username & Password) webhook auth: the merchant
    // configures a username/password pair in the PhonePe Business Dashboard
    // when creating the webhook, and PhonePe sends
    // `Authorization: SHA256(username:password)` (the header VALUE is the
    // hex SHA256 digest of "username:password", not base64 Basic auth).
    // Stored here as a single "Webhook Secret" field formatted
    // "username:password", matching the one field the manual-connect form
    // collects.
    if (!creds.webhookSecret || !creds.webhookSecret.includes(":")) return false;
    const expected = sha256Hex(creds.webhookSecret);
    return timingSafeEqualString(expected, signatureHeader.trim().toLowerCase());
  },

  parseWebhookEvent(rawBody: string): PaymentWebhookEvent {
    let parsed: PhonePeWebhookPayload;
    try {
      parsed = JSON.parse(rawBody) as PhonePeWebhookPayload;
    } catch {
      return { type: null, providerOrderId: null, providerPaymentId: null, providerRefundId: null, amountPaise: null, providerAccountId: null };
    }

    const type = parsed.event ? (EVENT_TYPE_MAP[parsed.event] ?? null) : null;
    const payload = parsed.payload;

    return {
      type,
      providerOrderId: payload?.merchantOrderId ?? payload?.originalMerchantOrderId ?? null,
      providerPaymentId: payload?.paymentDetails?.[0]?.transactionId ?? null,
      providerRefundId: payload?.refundId ?? payload?.merchantRefundId ?? null,
      amountPaise: payload?.amount ?? payload?.paymentDetails?.[0]?.amount ?? null,
      providerAccountId: null,
    };
  },

  async refundPayment(creds: DecryptedCredentials, input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const apiKeyCreds = requireApiKeyCreds(creds);
    const environment = apiKeyCreds.environment ?? "production";
    const { refundUrl } = resolveEndpoints(environment);
    const token = await getAccessToken(apiKeyCreds);

    // PhonePe's refund API keys off the ORIGINAL ORDER (`originalMerchantOrderId`),
    // not a discrete payment id the way Razorpay's `payments.refund(paymentId, ...)`
    // does. Any caller of this method for PhonePe must pass
    // `payment_transactions.provider_order_id` (our merchantOrderId, per
    // createOrder's comment above) as `input.providerPaymentId` — there is
    // no live caller of refundPayment for any provider in this codebase
    // yet, so this mapping is documented here for whoever wires one up.
    const merchantRefundId = `rfnd_${input.providerPaymentId}_${Date.now()}`;

    const response = await fetch(refundUrl, {
      method: "POST",
      headers: authHeaders(token, apiKeyCreds.providerMerchantId),
      body: JSON.stringify({
        merchantRefundId: merchantRefundId.slice(0, 63),
        originalMerchantOrderId: input.providerPaymentId,
        amount: input.amountPaise,
      }),
    });
    const json = (await response.json().catch(() => ({}))) as { refundId?: string; state?: string } & PhonePeErrorResponse;
    if (!response.ok || !json.refundId) {
      throw new Error(json.message ?? "Could not create PhonePe refund");
    }

    const status = json.state === "COMPLETED" ? "processed" : json.state === "FAILED" ? "failed" : "pending";
    return { providerRefundId: json.refundId, status };
  },

  async fetchOrderPayment(creds: DecryptedCredentials, providerOrderId: string): Promise<FetchOrderPaymentResult> {
    const apiKeyCreds = requireApiKeyCreds(creds);
    const environment = apiKeyCreds.environment ?? "production";
    const { statusUrl } = resolveEndpoints(environment);
    const token = await getAccessToken(apiKeyCreds);

    const response = await fetch(statusUrl(providerOrderId), {
      method: "GET",
      headers: authHeaders(token, apiKeyCreds.providerMerchantId),
    });
    if (!response.ok) {
      return { capturedPaymentId: null, amountPaise: null };
    }
    const json = (await response.json().catch(() => ({}))) as PhonePeStatusResponse;
    const completed = json.paymentDetails?.find((detail) => detail.state === "COMPLETED");
    if (!completed || json.state !== "COMPLETED") {
      return { capturedPaymentId: null, amountPaise: null };
    }
    return {
      capturedPaymentId: completed.transactionId ?? null,
      amountPaise: completed.amount ?? json.amount ?? null,
    };
  },
};
