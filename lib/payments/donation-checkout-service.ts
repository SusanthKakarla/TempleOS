import { randomUUID } from "node:crypto";
import { getTenantBySlug } from "@/lib/db/tenants";
import { getCampaignBySlugForTenant } from "@/lib/db/campaigns";
import { getCampaignDonationSummary, type CampaignDonationSummary } from "@/lib/db/campaign-analytics";
import { getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { createPaymentTransaction } from "@/lib/db/payment-transactions";
import { constantTimeEqual } from "./crypto";
import { createOrderForTenant } from "./payment-provider-service";
import type { Campaign, PaymentTransaction, Tenant, TenantPaymentAccount } from "@/types/db";

export interface DonationCheckoutContext {
  tenant: Tenant;
  campaign: Campaign;
  account: TenantPaymentAccount;
  summary: CampaignDonationSummary;
}

/**
 * The one load/validate chain for the public donation page — every failure
 * mode (unknown tenant, unknown campaign, wrong token, campaign not running,
 * no provider connected) returns the same `null`. Callers must render one
 * generic "this donation link isn't available" state regardless of which
 * check failed, so the page can never be used to enumerate valid
 * tenants/campaigns/tokens.
 */
export async function loadDonationCheckoutContext(
  tenantSlug: string,
  campaignSlug: string,
  token: string,
): Promise<DonationCheckoutContext | null> {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") return null;

  const campaign = await getCampaignBySlugForTenant(tenant.id, campaignSlug);
  if (!campaign) return null;
  if (!constantTimeEqual(campaign.donationToken, token)) return null;
  if (campaign.campaignType !== "donation" || campaign.status !== "running") return null;
  if (!campaign.linkedDonationPurpose) return null;

  const account = await getActivePaymentAccountForTenant(tenant.id);
  if (!account) return null;

  const summary = await getCampaignDonationSummary(tenant.id, campaign.linkedDonationPurpose);
  return { tenant, campaign, account, summary };
}

export interface CreateCheckoutOrderInput {
  amount: number;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
}

const RUPEE_TO_PAISE = 100;
/** Razorpay's `receipt` field caps at 40 chars and must be unique per account — a fresh random id (not the transaction's own id, which doesn't exist yet at this point) is generated first and used for both. */
function generateReceiptRef(): string {
  return randomUUID();
}

/** Server re-validates the full context again (never trusts that the client-rendered page state is still accurate). */
export async function createCheckoutOrder(
  tenantSlug: string,
  campaignSlug: string,
  token: string,
  input: CreateCheckoutOrderInput,
): Promise<{ transaction: PaymentTransaction; providerOrderId: string; keyId: string; currency: string } | null> {
  const context = await loadDonationCheckoutContext(tenantSlug, campaignSlug, token);
  if (!context) return null;
  if (!(input.amount > 0)) return null;

  // The order is created with the provider FIRST — payment_transactions.provider_order_id
  // is NOT NULL + unique, so there's no placeholder value to insert and then
  // patch; the real order id is known before the row is ever written.
  const order = await createOrderForTenant(context.tenant.id, {
    amountPaise: Math.round(input.amount * RUPEE_TO_PAISE),
    currency: "INR",
    receiptRef: generateReceiptRef(),
    notes: { campaignId: context.campaign.id },
  });
  if (!order) return null;

  const transaction = await createPaymentTransaction({
    tenantId: context.tenant.id,
    paymentAccountId: context.account.id,
    campaignId: context.campaign.id,
    providerKey: context.account.providerKey,
    providerOrderId: order.providerOrderId,
    amount: input.amount,
    currency: "INR",
    donorName: input.donorName,
    donorPhone: input.donorPhone,
    donorEmail: input.donorEmail,
    isAnonymous: input.isAnonymous,
  });

  return { transaction, providerOrderId: order.providerOrderId, keyId: order.keyId, currency: "INR" };
}
