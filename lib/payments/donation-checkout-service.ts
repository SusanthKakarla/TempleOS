import { randomUUID } from "node:crypto";
import { DEFAULT_DONATION_LINK_BASE_URL } from "@/lib/campaigns/donation-message";
import { evaluateCampaignWindow } from "@/lib/campaigns/campaign-visibility";
import { getTenantBySlug } from "@/lib/db/tenants";
import { getCampaignBySlugForTenant } from "@/lib/db/campaigns";
import { getCampaignDonationSummary, type CampaignDonationSummary } from "@/lib/db/campaign-analytics";
import { getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { createPaymentTransaction, createPendingUpiTransaction } from "@/lib/db/payment-transactions";
import { isProviderActive } from "@/lib/db/payment-providers";
import { constantTimeEqual } from "./crypto";
import { createOrderForTenant } from "./payment-provider-service";
import type { Campaign, PaymentTransaction, Tenant, TenantPaymentAccount } from "@/types/db";

export interface DonationCheckoutContext {
  tenant: Tenant;
  campaign: Campaign;
  /**
   * Null only in admin preview (see `previewBlockedReason`) — a public
   * visitor never reaches an `ok` result without a usable payment account.
   */
  account: TenantPaymentAccount | null;
  summary: CampaignDonationSummary;
  /**
   * Null for every public visit. In admin preview it carries the reason a
   * public visitor would have been turned away, so the page can render the
   * campaign *and* tell the admin exactly what the public currently sees.
   */
  previewBlockedReason: DonationCheckoutUnavailableReason | null;
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
 *
 * `preview: true` (an authenticated admin of THIS tenant — proven by the
 * caller, never by anything in the URL alone) keeps every identity check
 * above intact and downgrades only the *state* checks below them from
 * blocking to advisory, surfaced as `context.previewBlockedReason`. That is
 * the whole difference between the two modes: a preview can never conjure a
 * campaign that doesn't exist or whose token is wrong, it can only look at a
 * real one that the public can't see yet. Order creation never passes this
 * flag (see `loadDonationCheckoutContext`), so previewing can't move money.
 */
export async function resolveDonationCheckoutAvailability(
  tenantSlug: string,
  campaignSlug: string,
  token: string,
  options: { preview?: boolean } = {},
): Promise<DonationCheckoutAvailability> {
  const preview = options.preview === true;
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
  if (campaign.campaignType !== "donation") {
    logUnavailable("not_found", `campaign ${campaign.id} is not a donation campaign (campaignType=${campaign.campaignType})`);
    return { ok: false, reason: "not_found" };
  }
  // A donation campaign with no linked purpose has nothing to aggregate, so
  // "raised" would always read zero — misleading to a donor, which is why
  // the public sees not_found. An admin previewing their own half-finished
  // draft is exactly who needs to see it anyway, with the totals at zero.
  if (!campaign.linkedDonationPurpose && !preview) {
    logUnavailable("not_found", `campaign ${campaign.id} has no linkedDonationPurpose`);
    return { ok: false, reason: "not_found" };
  }

  const now = new Date();
  console.log(
    `[donation-checkout] campaign ${campaign.id} snapshot: status=${campaign.status} campaignStartDate=${campaign.campaignStartDate} campaignEndDate=${campaign.campaignEndDate} timezone=${tenant.timezone} now=${now.toISOString()} preview=${preview}`,
  );

  // Inclusive calendar-day window in the temple's own timezone — see
  // evaluateCampaignWindow for why this is never an instant comparison.
  const windowBlock = evaluateCampaignWindow(campaign, tenant.timezone, now);
  if (windowBlock && !preview) {
    logUnavailable(
      windowBlock,
      `campaign ${campaign.id} status=${campaign.status} window ${campaign.campaignStartDate ?? "—"}..${campaign.campaignEndDate ?? "—"} (${tenant.timezone})`,
    );
    return { ok: false, reason: windowBlock };
  }

  const account = await resolveUsablePaymentAccount(tenant.id);
  if (!account && !preview) {
    logUnavailable("payment_not_configured", `tenant ${tenant.id} has no usable payment account`);
    return { ok: false, reason: "payment_not_configured" };
  }

  const summary = campaign.linkedDonationPurpose
    ? await getCampaignDonationSummary(tenant.id, campaign.linkedDonationPurpose)
    : EMPTY_DONATION_SUMMARY;

  return {
    ok: true,
    context: {
      tenant,
      campaign,
      account,
      summary,
      // Public precedence order, preserved: the window verdict is what a
      // visitor would have hit first, so it's what the admin is told about.
      previewBlockedReason: preview ? (windowBlock ?? (account ? null : "payment_not_configured")) : null,
    },
  };
}

const EMPTY_DONATION_SUMMARY: CampaignDonationSummary = { totalAmount: 0, donationCount: 0, donorCount: 0, lastDonationAt: null };

/**
 * The tenant's payment account, but only if it can actually take money right
 * now — null otherwise, which every caller treats as "payments not set up".
 *
 * V0 product decision: TempleOS does not process payments directly.
 * Razorpay/PhonePe are toggled to `coming_soon` platform-wide
 * (migrations/039) — treating that exactly like "no account" is what makes
 * the toggle actually block checkout for already-connected tenants, not just
 * hide the Settings UI. Flipping the catalog row back to `active` re-enables
 * every one of them with zero code changes.
 */
async function resolveUsablePaymentAccount(tenantId: string): Promise<TenantPaymentAccount | null> {
  const account = await getActivePaymentAccountForTenant(tenantId);
  if (!account) return null;
  if (!(await isProviderActive(account.providerKey))) {
    logUnavailable("payment_not_configured", `tenant ${tenantId}'s provider "${account.providerKey}" is not platform-active`);
    return null;
  }
  return account;
}

/**
 * Thin boolean-gate wrapper over `resolveDonationCheckoutAvailability` for
 * callers (order creation) that only need go/no-go, not the reason.
 * Deliberately has no preview option — money movement is always judged by
 * the public rules, however the donor got to the page.
 */
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

/**
 * Standard UPI deep link (RBI/NPCI `upi://pay` spec) — app-agnostic on
 * purpose, never a `phonepe://`-style vendor-specific link. Params are
 * encoded with `encodeURIComponent` rather than `URLSearchParams` (which
 * encodes spaces as `+`) — several UPI apps parse the query string literally
 * and don't decode `+` back to a space, so a `+` would show up verbatim in
 * the payee name/note.
 */
function buildUpiUri(input: { vpa: string; payeeName: string; amount: number; note: string }): string {
  const params = [
    ["pa", input.vpa],
    ["pn", input.payeeName],
    ["am", input.amount.toFixed(2)],
    ["cu", "INR"],
    ["tn", input.note],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `upi://pay?${params}`;
}

/**
 * Where a redirect-based provider (PhonePe) sends the browser back after
 * checkout — the donation page's own /return route, which resolves the
 * outcome via the authoritative Order Status API, not a trusted query
 * param. `order` carries the merchantOrderId (= receiptRef =
 * payment_transactions.provider_order_id for PhonePe, see the adapter's own
 * comment) so /return can look the transaction up — nothing else identifies
 * it to an anonymous donor's browser.
 */
function buildReturnUrl(tenantSlug: string, campaignSlug: string, token: string, receiptRef: string): string {
  const base = process.env.DONATION_LINK_BASE_URL?.trim() || DEFAULT_DONATION_LINK_BASE_URL;
  return `${base.replace(/\/+$/, "")}/${tenantSlug}/${campaignSlug}/${token}/return?order=${encodeURIComponent(receiptRef)}`;
}

/** Server re-validates the full context again (never trusts that the client-rendered page state is still accurate). */
export async function createCheckoutOrder(
  tenantSlug: string,
  campaignSlug: string,
  token: string,
  input: CreateCheckoutOrderInput,
): Promise<{
  transaction: PaymentTransaction;
  providerOrderId: string;
  keyId: string;
  currency: string;
  redirectUrl: string | null;
  /** upi_manual only — the standard `upi://pay` deep link the client navigates to. Absent for gateway providers. */
  upiUri: string | null;
} | null> {
  const context = await loadDonationCheckoutContext(tenantSlug, campaignSlug, token);
  if (!context) return null;
  // Unreachable through the public gate (which never returns ok without a
  // usable account) — kept so the nullable-in-preview account can never be
  // dereferenced into a live order by a future caller.
  if (!context.account) return null;
  if (!(input.amount > 0)) return null;

  // upi_manual has no real gateway order to create — it never reaches the
  // adapter dispatch below (`createOrderForTenant`), which would throw
  // (no adapter is ever registered for this key; see payment-provider-service.ts).
  // The transaction is created directly as `pending_verification`, and the
  // "order id" is just the same receiptRef every provider already generates.
  if (context.account.providerKey === "upi_manual") {
    if (!context.account.upiVpa || !context.account.payeeName) return null;
    const receiptRef = generateReceiptRef();
    const note = input.donationMessage || context.account.defaultDonationNote || context.campaign.title;
    const upiUri = buildUpiUri({
      vpa: context.account.upiVpa,
      payeeName: context.account.payeeName,
      amount: input.amount,
      note,
    });
    const transaction = await createPendingUpiTransaction({
      tenantId: context.tenant.id,
      paymentAccountId: context.account.id,
      campaignId: context.campaign.id,
      providerOrderId: receiptRef,
      amount: input.amount,
      currency: "INR",
      donorName: input.donorName,
      donorPhone: input.donorPhone,
      donorEmail: input.donorEmail,
      donorPan: input.donorPan,
      donorMessage: input.donationMessage,
      isAnonymous: input.isAnonymous,
    });
    return { transaction, providerOrderId: receiptRef, keyId: "", currency: "INR", redirectUrl: null, upiUri };
  }

  // The order is created with the provider FIRST — payment_transactions.provider_order_id
  // is NOT NULL + unique, so there's no placeholder value to insert and then
  // patch; the real order id is known before the row is ever written.
  const receiptRef = generateReceiptRef();
  const order = await createOrderForTenant(context.tenant.id, {
    amountPaise: Math.round(input.amount * RUPEE_TO_PAISE),
    currency: "INR",
    receiptRef,
    notes: { campaignId: context.campaign.id },
    redirectUrl: buildReturnUrl(tenantSlug, campaignSlug, token, receiptRef),
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

  return {
    transaction,
    providerOrderId: order.providerOrderId,
    keyId: order.keyId,
    currency: "INR",
    redirectUrl: order.redirectUrl,
    upiUri: null,
  };
}
