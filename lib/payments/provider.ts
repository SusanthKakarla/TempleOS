export type PaymentProviderKey = "razorpay" | "stripe" | "cashfree" | "phonepe" | "payu";

export interface DecryptedCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
}

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

export type PaymentWebhookEventType = "payment.authorized" | "payment.captured" | "payment.failed" | "refund.processed";

export interface PaymentWebhookEvent {
  type: PaymentWebhookEventType | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
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
}
