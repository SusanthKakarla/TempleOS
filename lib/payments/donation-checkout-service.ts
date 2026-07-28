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

export type DonationCheckoutUnavailableReason =
  | "not_found"
  | "not_started"
  | "expired"
  | "disabled"
  | "payment_not_configured";

export type DonationCheckoutAvailability =
  | { ok: true; context: DonationCheckoutContext }
  | { ok: false; reason: DonationCheckoutUnavailableReason };

function logUnavailable(reason: DonationCheckoutUnavailableReason, detail: string): void {
  console.log(`[donation-checkout] unavailable (${reason}): ${detail}`);
}

/**
 * The one load/validate chain for the public donation page.
 *
 * Checks are deliberately split into two tiers to balance UX against the
 * anti-enumeration posture this page has always had:
 *  - Unknown tenant, unknown campaign, wrong campaign type/purpose, or a
 *    *wrong token* all collapse into the same generic "not_found" — telling
 *    someone "invalid token" (as opposed to "not found") would let them
 *    confirm a guessed tenant+campaign slug pair is real and just probe for
 *    the right token, which is exactly the enumeration this page must never
 *    allow.
 *  - Only once the token itself is proven correct (i.e. this exact campaign
 *    is confirmed real) is it safe to say *why* it can't accept donations
 *    right now — that reveals nothing an attacker didn't already prove by
 *    holding a valid token. "disabled" (campaign status) and
 *    "payment_not_configured" (no active payment account) are kept as
 *    distinct reasons rather than collapsed together — they are different
 *    root causes with different fixes, and conflating them previously meant
 *    a temple with a genuinely running campaign but no connected Razorpay
 *    account would be told "the temple has paused or closed this campaign",
 *    which is simply false.
 */
export async function resolveDonationCheckoutAvailability(
  tenantSlug: string,
  campaignSlug: string,
  token: string,
): Promise<DonationCheckoutAvailability> {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") {
    logUnavailable("not_found", `tenant "${tenantSlug}" missing or not active (status=${tenant?.status ?? "n/a"})`);
    return { ok: false, reason: "not_found" };
  }

  const campaign = await getCampaignBySlugForTenant(tenant.id, campaignSlug);
  if (!campaign) {
    logUnavailable("not_found", `no campaign with slug "${campaignSlug}" for tenant ${tenant.id}`);
    return { ok: false, reason: "not_found" };
  }
  if (!constantTimeEqual(campaign.donationToken, token)) {
    logUnavailable("not_found", `token mismatch for campaign ${campaign.id}`);
    return { ok: false, reason: "not_found" };
  }
  if (campaign.campaignType !== "donation" || !campaign.linkedDonationPurpose) {
    logUnavailable(
      "not_found",
      `campaign ${campaign.id} is not a configured donation campaign (campaignType=${campaign.campaignType}, linkedDonationPurpose=${campaign.linkedDonationPurpose})`,
    );
    return { ok: false, reason: "not_found" };
  }

  const now = new Date();
  console.log(
    `[donation-checkout] campaign ${campaign.id} snapshot: status=${campaign.status} campaignStartDate=${campaign.campaignStartDate} campaignEndDate=${campaign.campaignEndDate} now=${now.toISOString()}`,
  );

  if (campaign.campaignStartDate && new Date(campaign.campaignStartDate) > now) {
    logUnavailable("not_started", `campaign ${campaign.id} starts ${campaign.campaignStartDate}, now is ${now.toISOString()}`);
    return { ok: false, reason: "not_started" };
  }
  if (campaign.campaignEndDate && new Date(campaign.campaignEndDate) < now) {
    logUnavailable("expired", `campaign ${campaign.id} ended ${campaign.campaignEndDate}, now is ${now.toISOString()}`);
    return { ok: false, reason: "expired" };
  }
  if (campaign.status !== "running") {
    logUnavailable("disabled", `campaign ${campaign.id} status is "${campaign.status}", not "running"`);
    return { ok: false, reason: "disabled" };
  }

  const account = await getActivePaymentAccountForTenant(tenant.id);
  if (!account) {
    logUnavailable("payment_not_configured", `tenant ${tenant.id} has no active payment account`);
    return { ok: false, reason: "payment_not_configured" };
  }

  const summary = await getCampaignDonationSummary(tenant.id, campaign.linkedDonationPurpose);
  return { ok: true, context: { tenant, campaign, account, summary } };
}

/** Thin boolean-gate wrapper over `resolveDonationCheckoutAvailability` for callers (order creation) that only need go/no-go, not the reason. */
export async function loadDonationCheckoutContext(
  tenantSlug: string,
  campaignSlug: string,
  token: string,
): Promise<DonationCheckoutContext | null> {
  const result = await resolveDonationCheckoutAvailability(tenantSlug, campaignSlug, token);
  return result.ok ? result.context : null;
}

export interface CreateCheckoutOrderInput {
  amount: number;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  donorPan: string | null;
  donationMessage: string | null;
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
    donorPan: input.donorPan,
    donorMessage: input.donationMessage,
    isAnonymous: input.isAnonymous,
  });

  return { transaction, providerOrderId: order.providerOrderId, keyId: order.keyId, currency: "INR" };
}
