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
  /** Null exactly when `blockedReason === "payment_not_configured"` — the page still renders (banner/progress/etc.), just without a working Donate form. */
  account: TenantPaymentAccount | null;
  summary: CampaignDonationSummary;
}

/** The one reason that still hard-blocks the entire page — anti-enumeration only (see the function doc comment below). */
export type DonationCheckoutUnavailableReason = "not_found";

/** A campaign/tenant/token are all valid and the page renders, but the campaign isn't currently accepting payments. */
export type DonationBlockedReason = "not_started" | "expired" | "disabled" | "payment_not_configured" | "goal_reached";

export type DonationCheckoutAvailability =
  | { ok: true; context: DonationCheckoutContext; canDonate: boolean; blockedReason: DonationBlockedReason | null }
  | { ok: false; reason: DonationCheckoutUnavailableReason };

function logUnavailable(reason: DonationCheckoutUnavailableReason | DonationBlockedReason, detail: string): void {
  console.log(`[donation-checkout] unavailable (${reason}): ${detail}`);
}

/**
 * The one load/validate chain for the public donation page.
 *
 * Checks are deliberately split into two tiers to balance UX against the
 * anti-enumeration posture this page has always had, AND to keep "can this
 * page render at all" separate from "can a payment be made right now":
 *  - Unknown tenant, unknown campaign, wrong campaign type/purpose, or a
 *    *wrong token* all collapse into the same generic `ok: false,
 *    reason: "not_found"` — telling someone "invalid token" (as opposed to
 *    "not found") would let them confirm a guessed tenant+campaign slug
 *    pair is real and just probe for the right token, which is exactly the
 *    enumeration this page must never allow. This is the ONLY case that
 *    blocks the whole page.
 *  - Once the token itself is proven correct (i.e. this exact campaign is
 *    confirmed real), the result is always `ok: true` — the campaign's
 *    banner/title/description/progress render exactly like a live campaign
 *    (per product requirement: "the campaign page should still remain
 *    viewable, but payments must be blocked"). Whether the donor can
 *    actually complete a payment right now is a separate `canDonate`
 *    flag + `blockedReason` (not_started / expired / disabled — archived,
 *    cancelled, or manually paused / payment_not_configured / goal_reached),
 *    which the page uses to swap the interactive form for a friendly inline
 *    message instead of hiding the whole page.
 */
export async function resolveDonationCheckoutAvailability(
  tenantSlug: string,
  campaignSlug: string,
  token: string,
  options: { preview?: boolean } = {},
): Promise<DonationCheckoutAvailability> {
  // Admin preview (proven by the caller — a dashboard session for this tenant
  // or a short-lived signed token, never anything in the URL alone) relaxes
  // exactly one gate: a draft that has no donation purpose picked yet. Every
  // identity check still applies, and `canDonate`/`blockedReason` are
  // unchanged, so previewing can never create an order.
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
  if (campaign.campaignType !== "donation" || (!campaign.linkedDonationPurpose && !preview)) {
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

  // Precedence: the most specific/actionable reason wins when more than one
  // applies (e.g. an archived campaign whose dates have also lapsed still
  // reports "expired" first, matching the date-window checks' historical
  // priority over status).
  //
  // The date window is evaluated as INCLUSIVE CALENDAR DAYS IN THE TEMPLE'S
  // OWN TIMEZONE (see evaluateCampaignWindow). Comparing these DATE columns
  // as instants — `new Date("2026-08-31") < now` — resolves to midnight UTC,
  // i.e. 05:30 on the 31st in India, which reported a still-running campaign
  // as "expired" from that morning onward and killed a same-day campaign
  // outright. "disabled" continues to cover manually-paused campaigns as
  // well as archived/cancelled ones.
  let blockedReason: DonationBlockedReason | null = evaluateCampaignWindow(campaign, tenant.timezone, now);

  const account = await getActivePaymentAccountForTenant(tenant.id);
  // V0 product decision: TempleOS does not process payments directly.
  // Razorpay/PhonePe are toggled to `coming_soon` platform-wide
  // (migrations/039) — treating that exactly like "no account" here is what
  // makes the toggle actually block checkout for already-connected tenants,
  // not just hide the Settings UI. Flipping the catalog row back to
  // `active` re-enables every one of them with zero code changes.
  const providerUsable = account ? await isProviderActive(account.providerKey) : false;
  if (blockedReason === null && !providerUsable) {
    blockedReason = "payment_not_configured";
  }

  // Fetched unconditionally (also needed for display even when not blocked)
  // and — moved ahead of this being purely presentational — checked against
  // the goal last, after every other lifecycle/config reason, matching the
  // task's own specified check order: active? → within dates? → not
  // disabled? → payment configured? → target reached? This is a live,
  // uncached SUM query (getCampaignDonationSummary), so every call here sees
  // the true current total — there's no stale-read window a lock would need
  // to close. The only unavoidable edge case is two donors starting checkout
  // in the same instant while the goal isn't yet reached; both may complete
  // payment and the total can overshoot slightly once both capture — a
  // funds-reservation ledger would be needed to fully prevent that, which is
  // out of scope. What this guarantees is that no *new* order can ever be
  // created once the goal is already met, checked fresh on every attempt.
  // A purpose-less draft only reaches here in admin preview; it has nothing
  // to aggregate, so the totals stay at zero rather than querying for "".
  const summary = campaign.linkedDonationPurpose
    ? await getCampaignDonationSummary(tenant.id, campaign.linkedDonationPurpose)
    : { totalAmount: 0, donationCount: 0, donorCount: 0, lastDonationAt: null };
  if (blockedReason === null && campaign.goalAmount && summary.totalAmount >= Number(campaign.goalAmount)) {
    blockedReason = "goal_reached";
  }

  if (blockedReason) {
    logUnavailable(blockedReason, `campaign ${campaign.id}: ${blockedReason}`);
  }

  return {
    ok: true,
    context: { tenant, campaign, account: providerUsable ? account : null, summary },
    canDonate: blockedReason === null,
    blockedReason,
  };
}

/**
 * Thin wrapper over `resolveDonationCheckoutAvailability` for callers
 * (order creation, UPI proof confirmation) that need the context whenever
 * the campaign/token are valid, plus the `canDonate` gate — `null` only
 * for the true `not_found` case; a valid-but-currently-blocked campaign
 * still returns its context (so the page can render), but callers that are
 * about to actually create a payment must check `canDonate` themselves.
 */
export async function loadDonationCheckoutContext(
  tenantSlug: string,
  campaignSlug: string,
  token: string,
): Promise<{ context: DonationCheckoutContext; canDonate: boolean; blockedReason: DonationBlockedReason | null } | null> {
  const result = await resolveDonationCheckoutAvailability(tenantSlug, campaignSlug, token);
  if (!result.ok) return null;
  return { context: result.context, canDonate: result.canDonate, blockedReason: result.blockedReason };
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
  const loaded = await loadDonationCheckoutContext(tenantSlug, campaignSlug, token);
  if (!loaded) return null;
  // Hard server-side block regardless of what the page currently shows —
  // "Only if all validations pass should the system create" an order. The
  // page already hides the interactive form when `canDonate` is false, but
  // this is the authoritative check: a stale page load or a direct POST
  // must never be able to create an order for a campaign that has since
  // ended, been paused/archived, or lost its payment configuration.
  if (!loaded.canDonate || !loaded.context.account) return null;
  const context = { ...loaded.context, account: loaded.context.account };
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
