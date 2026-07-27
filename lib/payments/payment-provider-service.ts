import type { PaymentProviderAdapter, PaymentProviderKey } from "./provider";
import { razorpayAdapter } from "./adapters/razorpay-adapter";
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
  input: { amountPaise: number; currency: string; receiptRef: string; notes?: Record<string, string> },
): Promise<{ account: TenantPaymentAccount; providerOrderId: string; keyId: string } | null> {
  const active = await getActiveProviderForTenant(tenantId);
  if (!active) return null;
  const creds = await getDecryptedCredentialsForAccount(active.account.id);
  if (!creds) return null;
  const order = await active.adapter.createOrder(creds, input);
  return { account: active.account, providerOrderId: order.providerOrderId, keyId: creds.keyId };
}

export async function verifyCheckoutSignatureForAccount(
  accountId: string,
  providerKey: PaymentProviderKey,
  input: { providerOrderId: string; providerPaymentId: string; signature: string },
): Promise<boolean> {
  const creds = await getDecryptedCredentialsForAccount(accountId);
  if (!creds) return false;
  return getAdapter(providerKey).verifyCheckoutSignature(creds, input);
}

export async function verifyWebhookSignatureForAccount(
  accountId: string,
  providerKey: PaymentProviderKey,
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> {
  const creds = await getDecryptedCredentialsForAccount(accountId);
  if (!creds) return false;
  return getAdapter(providerKey).verifyWebhookSignature(creds, rawBody, signatureHeader);
}

export function parseWebhookEvent(providerKey: PaymentProviderKey, rawBody: string) {
  return getAdapter(providerKey).parseWebhookEvent(rawBody);
}

/** Best-effort credential check — never blocks provisioning/connect, only records an outcome (mirrors the WhatsApp template-bootstrap's non-blocking posture). */
export async function validateCredentials(
  providerKey: PaymentProviderKey,
  creds: { keyId: string; keySecret: string; webhookSecret: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  return getAdapter(providerKey).validateCredentials(creds);
}
