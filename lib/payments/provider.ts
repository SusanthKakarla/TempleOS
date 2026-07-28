export type PaymentProviderKey = "razorpay" | "stripe" | "cashfree" | "phonepe" | "payu";

/**
 * A tenant connects Razorpay one of two ways: pasting their own Key ID/Key
 * Secret ("api_key"), or via Razorpay's Partner OAuth flow ("oauth"), which
 * yields an access/refresh token pair instead. Every adapter method takes
 * this union and branches internally — callers (checkout, webhook, refund,
 * reconciliation) never need to know which mode a given tenant used.
 */
export type DecryptedCredentials =
  | { mode: "api_key"; keyId: string; keySecret: string; webhookSecret: string | null }
  | {
      mode: "oauth";
      accessToken: string;
      refreshToken: string;
      /** ISO timestamp — read by the reconciliation cron's token-refresh step, not a secret. */
      accessTokenExpiresAt: string;
      /** Replaces `key_id` for Razorpay Checkout's public-facing config in OAuth mode — not a secret. */
      publicToken: string | null;
      webhookSecret: string | null;
    };

export interface CreateOrderInput {
  amountPaise: number;
  currency: string;
  receiptRef: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  providerOrderId: string;
}

export interface VerifyCheckoutSignatureInput {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export type PaymentWebhookEventType =
  | "payment.authorized"
  | "payment.captured"
  | "payment.failed"
  | "refund.processed"
  | "refund.failed"
  /** Never emitted today — this app creates Orders + Checkout, never Payment Links. Parsed for forward-compatibility only. */
  | "payment.link.paid";

export interface PaymentWebhookEvent {
  type: PaymentWebhookEventType | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  amountPaise: number | null;
  /** Partner (OAuth) webhooks only — the sub-merchant account id the event belongs to, used to resolve the owning tenant since one platform-level endpoint serves every partner-connected tenant. */
  providerAccountId: string | null;
}

export interface RefundPaymentInput {
  providerPaymentId: string;
  amountPaise: number;
  notes?: Record<string, string>;
}

export interface RefundPaymentResult {
  providerRefundId: string;
  status: "pending" | "processed" | "failed";
}

export interface FetchOrderPaymentResult {
  /** Whether Razorpay shows a captured payment for this order — used by reconciliation to detect a missed webhook. */
  capturedPaymentId: string | null;
  amountPaise: number | null;
}

/**
 * The one interface every payment provider implements. Nothing outside
 * `lib/payments/payment-provider-service.ts` may import a concrete adapter
 * directly — campaigns/donations/checkout/webhook code only ever calls
 * `PaymentProviderService`, so adding a new provider later means writing one
 * new adapter file and one registry entry, never touching calling code.
 */
export interface PaymentProviderAdapter {
  readonly key: PaymentProviderKey;
  validateCredentials(creds: DecryptedCredentials): Promise<{ ok: true } | { ok: false; error: string }>;
  createOrder(creds: DecryptedCredentials, input: CreateOrderInput): Promise<CreateOrderResult>;
  verifyCheckoutSignature(creds: DecryptedCredentials, input: VerifyCheckoutSignatureInput): boolean;
  verifyWebhookSignature(creds: DecryptedCredentials, rawBody: string, signatureHeader: string): boolean;
  parseWebhookEvent(rawBody: string): PaymentWebhookEvent;
  /** Admin-initiated refund (full or partial) — Razorpay returns a real refund id synchronously. */
  refundPayment(creds: DecryptedCredentials, input: RefundPaymentInput): Promise<RefundPaymentResult>;
  /** Reconciliation-only: checks whether the provider actually captured a payment for an order our own records show as still pending. */
  fetchOrderPayment(creds: DecryptedCredentials, providerOrderId: string): Promise<FetchOrderPaymentResult>;
}
