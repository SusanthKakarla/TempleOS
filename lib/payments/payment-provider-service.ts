import type { DecryptedCredentials, PaymentProviderAdapter, PaymentProviderKey, ValidateCredentialsResult } from "./provider";
import { razorpayAdapter } from "./adapters/razorpay-adapter";
import { phonepeAdapter } from "./adapters/phonepe-adapter";
import {
  getActivePaymentAccountForTenant,
  getDecryptedCredentialsForAccount,
} from "@/lib/db/tenant-payment-accounts";
import type { TenantPaymentAccount } from "@/types/db";

/**
 * The one chokepoint every payment-related call goes through. Campaigns,
 * donation checkout, and the webhook handler never import a concrete
 * adapter (e.g. RazorpayAdapter) or the `razorpay` package directly — only
 * this service. Adding Stripe/Cashfree/PhonePe/PayU later is one new
 * adapter file + one entry in this registry map; zero changes anywhere else.
 */
const ADAPTERS: Partial<Record<PaymentProviderKey, PaymentProviderAdapter>> = {
  razorpay: razorpayAdapter,
  phonepe: phonepeAdapter,
};

function getAdapter(key: PaymentProviderKey): PaymentProviderAdapter {
  const adapter = ADAPTERS[key];
  if (!adapter) {
    throw new Error(`No payment provider adapter registered for "${key}"`);
  }
  return adapter;
}

export interface ActivePaymentAccount {
  account: TenantPaymentAccount;
  adapter: PaymentProviderAdapter;
}

/** Resolves a tenant's active payment account + its adapter, or null if nothing is connected. */
export async function getActiveProviderForTenant(tenantId: string): Promise<ActivePaymentAccount | null> {
  const account = await getActivePaymentAccountForTenant(tenantId);
  if (!account) return null;
  return { account, adapter: getAdapter(account.providerKey) };
}

export async function createOrderForTenant(
  tenantId: string,
  input: { amountPaise: number; currency: string; receiptRef: string; notes?: Record<string, string>; redirectUrl?: string },
): Promise<{ account: TenantPaymentAccount; providerOrderId: string; keyId: string; redirectUrl: string | null } | null> {
  const active = await getActiveProviderForTenant(tenantId);
  if (!active) return null;
  const creds = await getDecryptedCredentialsForAccount(tenantId, active.account.id);
  if (!creds) return null;
  const order = await active.adapter.createOrder(creds, input);
  // Checkout.js needs a public-facing key: the tenant's own key_id in manual
  // mode, or the Partner-issued public_token in OAuth mode (Razorpay docs:
  // "public_token can replace key_id for public-facing implementations such
  // as Razorpay Checkout"). PhonePe's redirect-based flow needs no
  // public-facing key at all — the client never talks to PhonePe directly,
  // it just navigates to `redirectUrl` below.
  const keyId = creds.mode === "api_key" ? creds.keyId : (creds.publicToken ?? "");
  return { account: active.account, providerOrderId: order.providerOrderId, keyId, redirectUrl: order.redirectUrl ?? null };
}

export async function verifyCheckoutSignatureForAccount(
  tenantId: string,
  accountId: string,
  providerKey: PaymentProviderKey,
  input: { providerOrderId: string; providerPaymentId: string; signature: string },
): Promise<boolean> {
  const creds = await getDecryptedCredentialsForAccount(tenantId, accountId);
  if (!creds) return false;
  return getAdapter(providerKey).verifyCheckoutSignature(creds, input);
}

/**
 * Partner (OAuth) webhooks are signed with the Partner application's own
 * webhook secret — a single platform-wide value, not any one tenant's
 * stored secret — so this reuses the adapter's HMAC verification directly
 * instead of resolving a tenant's credentials first (there is no tenant to
 * resolve yet at this point; that only happens after the payload is
 * trusted). No new signature-verification code, same `verifyWebhookSignature`
 * every other Razorpay webhook already uses.
 */
export function verifyPartnerWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const webhookSecret = process.env.RAZORPAY_PARTNER_WEBHOOK_SECRET ?? null;
  if (!webhookSecret) return false;
  const creds: DecryptedCredentials = {
    mode: "oauth",
    accessToken: "",
    refreshToken: "",
    accessTokenExpiresAt: new Date(0).toISOString(),
    publicToken: null,
    webhookSecret,
  };
  return getAdapter("razorpay").verifyWebhookSignature(creds, rawBody, signatureHeader);
}

export async function verifyWebhookSignatureForAccount(
  tenantId: string,
  accountId: string,
  providerKey: PaymentProviderKey,
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> {
  const creds = await getDecryptedCredentialsForAccount(tenantId, accountId);
  if (!creds) return false;
  return getAdapter(providerKey).verifyWebhookSignature(creds, rawBody, signatureHeader);
}

export function parseWebhookEvent(providerKey: PaymentProviderKey, rawBody: string) {
  return getAdapter(providerKey).parseWebhookEvent(rawBody);
}

/** Live credential check against the provider's own API — used by the Super Admin's manual-connect route to reject bad keys before saving them (mirrors the WhatsApp manual-connect route's "validate before persisting" posture). */
export async function validateCredentials(
  providerKey: PaymentProviderKey,
  creds: {
    keyId: string;
    keySecret: string;
    webhookSecret: string | null;
    providerMerchantId?: string | null;
    environment?: "sandbox" | "production";
  },
): Promise<ValidateCredentialsResult> {
  const decrypted: DecryptedCredentials = { mode: "api_key", ...creds };
  return getAdapter(providerKey).validateCredentials(decrypted);
}

export async function fetchOrderPaymentForTenant(
  tenantId: string,
  providerOrderId: string,
): Promise<{ capturedPaymentId: string | null; amountPaise: number | null } | null> {
  const active = await getActiveProviderForTenant(tenantId);
  if (!active) return null;
  const creds = await getDecryptedCredentialsForAccount(tenantId, active.account.id);
  if (!creds) return null;
  return active.adapter.fetchOrderPayment(creds, providerOrderId);
}
