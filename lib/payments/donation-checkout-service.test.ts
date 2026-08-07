import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTenantBySlug } from "@/lib/db/tenants";
import { getCampaignBySlugForTenant } from "@/lib/db/campaigns";
import { getCampaignDonationSummary } from "@/lib/db/campaign-analytics";
import { getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { isProviderActive } from "@/lib/db/payment-providers";
import { loadDonationCheckoutContext, resolveDonationCheckoutAvailability } from "./donation-checkout-service";
import type { Campaign, Tenant, TenantPaymentAccount } from "@/types/db";

vi.mock("@/lib/db/tenants", () => ({ getTenantBySlug: vi.fn() }));
vi.mock("@/lib/db/campaigns", () => ({ getCampaignBySlugForTenant: vi.fn() }));
vi.mock("@/lib/db/campaign-analytics", () => ({ getCampaignDonationSummary: vi.fn() }));
vi.mock("@/lib/db/tenant-payment-accounts", () => ({ getActivePaymentAccountForTenant: vi.fn() }));
vi.mock("@/lib/db/payment-transactions", () => ({ createPaymentTransaction: vi.fn(), createPendingUpiTransaction: vi.fn() }));
vi.mock("@/lib/db/payment-providers", () => ({ isProviderActive: vi.fn() }));
vi.mock("./payment-provider-service", () => ({ createOrderForTenant: vi.fn() }));

const tenant: Tenant = {
  id: "tenant-1",
  slug: "sri-temple",
  name: "Sri Temple",
  status: "active",
  defaultContactPhone: null,
  address: null,
  timezone: "Asia/Kolkata",
  welcomeMessage: null,
  description: null,
  history: null,
  contactEmail: null,
  googleMapsLink: null,
  morningOpen: null,
  morningClose: null,
  eveningOpen: null,
  eveningClose: null,
  donationInfo: null,
  notifyOnNewEvent: false,
  notifyOnEventUpdated: false,
  notifyOnEventCancelled: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "campaign-1",
    tenantId: "tenant-1",
    title: "Annadanam Fund",
    description: null,
    campaignType: "donation",
    status: "running",
    channel: "whatsapp",
    templateKey: null,
    customMessage: null,
    audienceFilter: { type: "all" },
    bannerMediaId: null,
    linkedEventId: null,
    linkedDonationPurpose: "annadanam",
    scheduleType: "one_time",
    scheduledAt: null,
    recurrenceRule: null,
    nextRunAt: null,
    lastRunAt: null,
    goalAmount: "100000",
    campaignStartDate: null,
    campaignEndDate: null,
    closingReminderSentAt: null,
    targetReachedAnnouncedAt: null,
    slug: "annadanam-fund",
    donationToken: "correct-token",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const account: TenantPaymentAccount = {
  id: "acct-1",
  tenantId: "tenant-1",
  providerKey: "razorpay",
  connectionMethod: "manual",
  razorpayAccountId: null,
  providerMerchantId: null,
  environment: "production" as const,
  upiVpa: null,
  payeeName: null,
  qrCodeUrl: null,
  bankLabel: null,
  defaultDonationNote: null,
  status: "connected",
  isActive: true,
  lastValidatedAt: null,
  lastValidationError: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("resolveDonationCheckoutAvailability", () => {
  beforeEach(() => {
    vi.mocked(getTenantBySlug).mockReset();
    vi.mocked(getCampaignBySlugForTenant).mockReset();
    vi.mocked(getCampaignDonationSummary)
      .mockReset()
      .mockResolvedValue({ totalAmount: 0, donationCount: 0, donorCount: 0, lastDonationAt: null });
    vi.mocked(getActivePaymentAccountForTenant).mockReset().mockResolvedValue(account);
    vi.mocked(isProviderActive).mockReset().mockResolvedValue(true);
  });

  it("returns not_found for an unknown tenant", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(null);
    const result = await resolveDonationCheckoutAvailability("nope", "annadanam-fund", "correct-token");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns not_found for an inactive tenant", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue({ ...tenant, status: "suspended" });
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns not_found for an unknown campaign", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(null);
    const result = await resolveDonationCheckoutAvailability("sri-temple", "nope", "correct-token");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns not_found (never a distinct 'invalid token' reason) for a wrong token — preserves anti-enumeration", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign());
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "wrong-token");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns not_found for a non-donation campaign or one with no linked donation purpose", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ linkedDonationPurpose: null }));
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns expired once the token is correct but the campaign end date has passed", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ campaignEndDate: "2020-01-01T00:00:00.000Z" }),
    );
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("does not expire a campaign whose end date is in the future", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ campaignEndDate: "2099-01-01T00:00:00.000Z" }),
    );
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
  });

  it.each(["draft", "scheduled", "running", "paused", "completed"] as const)(
    "allows the donation page for a %s campaign — availability is decoupled from WhatsApp send status, only archived/cancelled block it",
    async (status) => {
      vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
      vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ status }));
      const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
      expect(result.ok).toBe(true);
    },
  );

  it.each(["archived", "cancelled"] as const)("returns disabled once the token is correct but the campaign is %s", async (status) => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ status }));
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result).toEqual({ ok: false, reason: "disabled" });
  });

  it("returns payment_not_configured (not 'disabled') when no active payment account is connected — a running campaign should never be blamed as 'paused or closed' for a payment-setup gap", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign());
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue(null);
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result).toEqual({ ok: false, reason: "payment_not_configured" });
  });

  it("returns payment_not_configured when the connected provider is platform-disabled (V0 gateway toggle)", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign());
    vi.mocked(isProviderActive).mockResolvedValue(false);
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result).toEqual({ ok: false, reason: "payment_not_configured" });
  });

  it("returns not_started once the token is correct but the campaign start date is in the future", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ campaignStartDate: "2099-01-01T00:00:00.000Z" }),
    );
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result).toEqual({ ok: false, reason: "not_started" });
  });

  it("does not block a campaign whose start date is in the past", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ campaignStartDate: "2020-01-01T00:00:00.000Z" }),
    );
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
  });

  it("checks not_started before expired/disabled/payment checks (most specific boundary first)", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ campaignStartDate: "2099-01-01T00:00:00.000Z", status: "paused" }),
    );
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result).toEqual({ ok: false, reason: "not_started" });
  });

  it("returns ok with the full context for a valid, running campaign", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign());
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.tenant).toEqual(tenant);
      expect(result.context.account).toEqual(account);
    }
  });
});

describe("resolveDonationCheckoutAvailability — inclusive campaign window in the temple's timezone", () => {
  beforeEach(() => {
    vi.mocked(getTenantBySlug).mockReset().mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockReset();
    vi.mocked(getCampaignDonationSummary)
      .mockReset()
      .mockResolvedValue({ totalAmount: 0, donationCount: 0, donorCount: 0, lastDonationAt: null });
    vi.mocked(getActivePaymentAccountForTenant).mockReset().mockResolvedValue(account);
    vi.mocked(isProviderActive).mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("regression: the campaign stays open all through its end date in IST — it used to flip to 'expired' at 05:30 that morning (UTC midnight of a DATE column), showing 'This campaign has ended' to visitors and admins of a campaign that was still running", async () => {
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ campaignEndDate: "2026-08-31" }));

    vi.useFakeTimers().setSystemTime(new Date("2026-08-31T00:30:00.000Z")); // 06:00 IST on the end date
    expect((await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token")).ok).toBe(true);

    vi.setSystemTime(new Date("2026-08-31T18:29:00.000Z")); // 23:59 IST, still the end date
    expect((await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token")).ok).toBe(true);

    vi.setSystemTime(new Date("2026-08-31T18:31:00.000Z")); // 00:01 IST the next day
    expect(await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token")).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("opens a campaign from the first local minute of its start date", async () => {
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ campaignStartDate: "2026-08-07" }));

    vi.useFakeTimers().setSystemTime(new Date("2026-08-06T18:29:00.000Z")); // 23:59 IST on the 6th
    expect(await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token")).toEqual({
      ok: false,
      reason: "not_started",
    });

    vi.setSystemTime(new Date("2026-08-06T18:31:00.000Z")); // 00:01 IST on the 7th
    expect((await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token")).ok).toBe(true);
  });
});

describe("resolveDonationCheckoutAvailability — admin preview", () => {
  const previewing = { preview: true };

  beforeEach(() => {
    vi.mocked(getTenantBySlug).mockReset().mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockReset().mockResolvedValue(makeCampaign());
    vi.mocked(getCampaignDonationSummary)
      .mockReset()
      .mockResolvedValue({ totalAmount: 0, donationCount: 0, donorCount: 0, lastDonationAt: null });
    vi.mocked(getActivePaymentAccountForTenant).mockReset().mockResolvedValue(account);
    vi.mocked(isProviderActive).mockReset().mockResolvedValue(true);
  });

  it.each([
    ["an expired campaign", { campaignEndDate: "2020-01-01" }, "expired"],
    ["a not-yet-started campaign", { campaignStartDate: "2099-01-01" }, "not_started"],
    ["an archived campaign", { status: "archived" as const }, "disabled"],
    ["a cancelled campaign", { status: "cancelled" as const }, "disabled"],
  ])("renders %s for an admin, reporting what the public would have seen", async (_label, overrides, reason) => {
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign(overrides));

    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token", previewing);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.previewBlockedReason).toBe(reason);
  });

  it("renders for an admin when the temple has no usable payment account, with the account left null so no checkout form is shown", async () => {
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue(null);

    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token", previewing);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.account).toBeNull();
      expect(result.context.previewBlockedReason).toBe("payment_not_configured");
    }
  });

  it("renders a draft with no linked donation purpose yet, with the fundraising totals at zero", async () => {
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ status: "draft", linkedDonationPurpose: null }),
    );

    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token", previewing);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.summary).toEqual({ totalAmount: 0, donationCount: 0, donorCount: 0, lastDonationAt: null });
      expect(result.context.previewBlockedReason).toBeNull();
    }
    expect(getCampaignDonationSummary).not.toHaveBeenCalled();
  });

  it("reports no blocked reason when the campaign is genuinely live — the admin is seeing the real public page", async () => {
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token", previewing);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.previewBlockedReason).toBeNull();
  });

  it("still refuses a wrong token — preview relaxes campaign state, never identity", async () => {
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "wrong-token", previewing);
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("still refuses an unknown tenant, an inactive tenant, and a non-donation campaign", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(null);
    expect(await resolveDonationCheckoutAvailability("nope", "annadanam-fund", "correct-token", previewing)).toEqual({
      ok: false,
      reason: "not_found",
    });

    vi.mocked(getTenantBySlug).mockResolvedValue({ ...tenant, status: "suspended" });
    expect(await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token", previewing)).toEqual({
      ok: false,
      reason: "not_found",
    });

    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ campaignType: "festival" }));
    expect(await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token", previewing)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});

describe("loadDonationCheckoutContext", () => {
  beforeEach(() => {
    vi.mocked(getTenantBySlug).mockReset();
    vi.mocked(getCampaignBySlugForTenant).mockReset();
    vi.mocked(getCampaignDonationSummary)
      .mockReset()
      .mockResolvedValue({ totalAmount: 0, donationCount: 0, donorCount: 0, lastDonationAt: null });
    vi.mocked(getActivePaymentAccountForTenant).mockReset().mockResolvedValue(account);
    vi.mocked(isProviderActive).mockReset().mockResolvedValue(true);
  });

  it("collapses any unavailable reason to null for callers that only need a boolean gate", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(null);
    expect(await loadDonationCheckoutContext("nope", "nope", "nope")).toBeNull();
  });

  it("returns the context when available", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign());
    const context = await loadDonationCheckoutContext("sri-temple", "annadanam-fund", "correct-token");
    expect(context?.campaign.id).toBe("campaign-1");
  });

  it("judges an expired campaign by the public rules — order creation must never inherit an admin's preview access", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ campaignEndDate: "2020-01-01" }));
    expect(await loadDonationCheckoutContext("sri-temple", "annadanam-fund", "correct-token")).toBeNull();
  });
});
