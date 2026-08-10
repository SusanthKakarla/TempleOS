import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTenantBySlug } from "@/lib/db/tenants";
import { getCampaignBySlugForTenant } from "@/lib/db/campaigns";
import { getCampaignDonationSummary } from "@/lib/db/campaign-analytics";
import { getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { createPendingUpiTransaction } from "@/lib/db/payment-transactions";
import { isProviderActive } from "@/lib/db/payment-providers";
import { createCheckoutOrder, loadDonationCheckoutContext, resolveDonationCheckoutAvailability } from "./donation-checkout-service";
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

  it("blocks payment with expired once the token is correct but the campaign end date has passed — page still renders", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ campaignEndDate: "2020-01-01T00:00:00.000Z" }),
    );
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canDonate).toBe(false);
      expect(result.blockedReason).toBe("expired");
    }
  });

  it("does not expire a campaign whose end date is in the future", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ campaignEndDate: "2099-01-01T00:00:00.000Z" }),
    );
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.canDonate).toBe(true);
  });

  it.each(["draft", "scheduled", "running", "completed"] as const)(
    "allows the donation page and payment for a %s campaign — availability is decoupled from WhatsApp send status",
    async (status) => {
      vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
      vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ status }));
      const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.canDonate).toBe(true);
        expect(result.blockedReason).toBeNull();
      }
    },
  );

  it.each(["archived", "cancelled", "paused"] as const)(
    "renders the page but blocks payment with 'disabled' once the token is correct but the campaign is %s (manually disabled)",
    async (status) => {
      vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
      vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ status }));
      const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.canDonate).toBe(false);
        expect(result.blockedReason).toBe("disabled");
      }
    },
  );

  it("blocks payment with payment_not_configured (not 'disabled') when no active payment account is connected — a running campaign should never be blamed as 'paused or closed' for a payment-setup gap", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign());
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue(null);
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canDonate).toBe(false);
      expect(result.blockedReason).toBe("payment_not_configured");
      expect(result.context.account).toBeNull();
    }
  });

  it("blocks payment with payment_not_configured when the connected provider is platform-disabled (V0 gateway toggle)", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign());
    vi.mocked(isProviderActive).mockResolvedValue(false);
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canDonate).toBe(false);
      expect(result.blockedReason).toBe("payment_not_configured");
    }
  });

  it("blocks payment with not_started once the token is correct but the campaign start date is in the future — page still renders", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ campaignStartDate: "2099-01-01T00:00:00.000Z" }),
    );
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canDonate).toBe(false);
      expect(result.blockedReason).toBe("not_started");
    }
  });

  it("does not block a campaign whose start date is in the past", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ campaignStartDate: "2020-01-01T00:00:00.000Z" }),
    );
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.canDonate).toBe(true);
  });

  it("checks not_started before expired/disabled/payment checks (most specific boundary first)", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(
      makeCampaign({ campaignStartDate: "2099-01-01T00:00:00.000Z", status: "paused" }),
    );
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.blockedReason).toBe("not_started");
  });

  it("blocks payment with goal_reached once the live total meets the goal exactly", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ goalAmount: "1000" }));
    vi.mocked(getCampaignDonationSummary).mockResolvedValue({ totalAmount: 1000, donationCount: 3, donorCount: 3, lastDonationAt: null });
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canDonate).toBe(false);
      expect(result.blockedReason).toBe("goal_reached");
    }
  });

  it("blocks payment with goal_reached once the live total exceeds the goal", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ goalAmount: "1000" }));
    vi.mocked(getCampaignDonationSummary).mockResolvedValue({ totalAmount: 1500, donationCount: 4, donorCount: 4, lastDonationAt: null });
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.blockedReason).toBe("goal_reached");
  });

  it("does not block when the live total is still under the goal", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ goalAmount: "1000" }));
    vi.mocked(getCampaignDonationSummary).mockResolvedValue({ totalAmount: 999, donationCount: 2, donorCount: 2, lastDonationAt: null });
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canDonate).toBe(true);
      expect(result.blockedReason).toBeNull();
    }
  });

  it("checks payment_not_configured before goal_reached (matches the task's specified check order)", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ goalAmount: "1000" }));
    vi.mocked(getCampaignDonationSummary).mockResolvedValue({ totalAmount: 1500, donationCount: 4, donorCount: 4, lastDonationAt: null });
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue(null);
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.blockedReason).toBe("payment_not_configured");
  });

  it("returns ok with the full context for a valid, running campaign", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign());
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canDonate).toBe(true);
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

    const blockedReasonNow = async () => {
      const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
      return result.ok ? result.blockedReason : `not_ok:${result.reason}`;
    };

    vi.useFakeTimers().setSystemTime(new Date("2026-08-31T00:30:00.000Z")); // 06:00 IST on the end date
    expect(await blockedReasonNow()).toBeNull();

    vi.setSystemTime(new Date("2026-08-31T18:29:00.000Z")); // 23:59 IST, still the end date
    expect(await blockedReasonNow()).toBeNull();

    vi.setSystemTime(new Date("2026-08-31T18:31:00.000Z")); // 00:01 IST the next day
    expect(await blockedReasonNow()).toBe("expired");
  });

  it("opens a campaign from the first local minute of its start date", async () => {
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ campaignStartDate: "2026-08-07" }));

    const blockedReasonNow = async () => {
      const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token");
      return result.ok ? result.blockedReason : `not_ok:${result.reason}`;
    };

    vi.useFakeTimers().setSystemTime(new Date("2026-08-06T18:29:00.000Z")); // 23:59 IST on the 6th
    expect(await blockedReasonNow()).toBe("not_started");

    vi.setSystemTime(new Date("2026-08-06T18:31:00.000Z")); // 00:01 IST on the 7th
    expect(await blockedReasonNow()).toBeNull();
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
    ["a paused campaign", { status: "paused" as const }, "disabled"],
  ])("renders %s for an admin, reporting what the public would have seen", async (_label, overrides, reason) => {
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign(overrides));

    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token", previewing);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blockedReason).toBe(reason);
      expect(result.canDonate).toBe(false);
    }
  });

  it("renders for an admin when the temple has no usable payment account, with the account left null so no checkout form is shown", async () => {
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue(null);

    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token", previewing);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.account).toBeNull();
      expect(result.blockedReason).toBe("payment_not_configured");
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
    }
    expect(getCampaignDonationSummary).not.toHaveBeenCalled();
  });

  it("reports no blocked reason when the campaign is genuinely live — the admin is seeing the real public page", async () => {
    const result = await resolveDonationCheckoutAvailability("sri-temple", "annadanam-fund", "correct-token", previewing);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blockedReason).toBeNull();
      expect(result.canDonate).toBe(true);
    }
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
    const loaded = await loadDonationCheckoutContext("sri-temple", "annadanam-fund", "correct-token");
    expect(loaded?.context.campaign.id).toBe("campaign-1");
    expect(loaded?.canDonate).toBe(true);
  });

  it("still returns the context (with canDonate: false) for a campaign the page can render but payment is blocked on", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ status: "paused" }));
    const loaded = await loadDonationCheckoutContext("sri-temple", "annadanam-fund", "correct-token");
    expect(loaded?.context.campaign.id).toBe("campaign-1");
    expect(loaded?.canDonate).toBe(false);
    expect(loaded?.blockedReason).toBe("disabled");
  });
});

describe("createCheckoutOrder — the upi_manual payment link", () => {
  const upiAccount: TenantPaymentAccount = {
    ...account,
    providerKey: "upi_manual",
    upiVpa: "temple@upi",
    payeeName: "Sri Shiva Temple",
    defaultDonationNote: null,
  };

  const checkoutInput = {
    amount: 501,
    donorName: "Test Donor",
    donorPhone: "9999999999",
    donorEmail: null,
    donorPan: null,
    donationMessage: null,
    isAnonymous: false,
  };

  beforeEach(() => {
    vi.mocked(getTenantBySlug).mockReset().mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockReset().mockResolvedValue(makeCampaign({ title: "Renovation Donation" }));
    vi.mocked(getCampaignDonationSummary)
      .mockReset()
      .mockResolvedValue({ totalAmount: 0, donationCount: 0, donorCount: 0, lastDonationAt: null });
    vi.mocked(getActivePaymentAccountForTenant).mockReset().mockResolvedValue(upiAccount);
    vi.mocked(isProviderActive).mockReset().mockResolvedValue(true);
    vi.mocked(createPendingUpiTransaction)
      .mockReset()
      .mockImplementation(async (input) => ({ id: "txn-1", ...input }) as never);
  });

  it("builds a standard, app-agnostic upi://pay link from the temple's own configuration", async () => {
    const order = await createCheckoutOrder("sri-temple", "annadanam-fund", "correct-token", checkoutInput);
    const uri = order?.upiUri ?? "";

    expect(uri.startsWith("upi://pay?")).toBe(true);
    const params = new URLSearchParams(uri.slice("upi://pay?".length));
    expect(params.get("pa")).toBe("temple@upi");
    expect(params.get("pn")).toBe("Sri Shiva Temple");
    expect(params.get("am")).toBe("501.00");
    expect(params.get("cu")).toBe("INR");
    expect(params.get("tn")).toBe("Renovation Donation");
  });

  it("never emits a vendor-specific or unrelated scheme — the OS chooser decides which UPI app opens", async () => {
    const order = await createCheckoutOrder("sri-temple", "annadanam-fund", "correct-token", checkoutInput);
    const uri = order?.upiUri ?? "";

    for (const scheme of ["phonepe://", "whatsapp://", "wa.me", "gpay://", "paytmmp://", "tez://"]) {
      expect(uri).not.toContain(scheme);
    }
    expect(order?.redirectUrl).toBeNull();
  });

  it("URL-encodes payee name and note so spaces and symbols can't break the link", async () => {
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue({
      ...upiAccount,
      payeeName: "Sri Uma & Ramalingeswara Temple",
      defaultDonationNote: "Annadanam / Seva",
    });

    const order = await createCheckoutOrder("sri-temple", "annadanam-fund", "correct-token", checkoutInput);
    const uri = order?.upiUri ?? "";

    // Encoded on the wire (never a raw space or &, which would truncate the query)...
    expect(uri).toContain("pn=Sri%20Uma%20%26%20Ramalingeswara%20Temple");
    expect(uri).toContain("tn=Annadanam%20%2F%20Seva");
    // ...and still decodes back to exactly what the admin configured.
    const params = new URLSearchParams(uri.slice("upi://pay?".length));
    expect(params.get("pn")).toBe("Sri Uma & Ramalingeswara Temple");
    expect(params.get("tn")).toBe("Annadanam / Seva");
  });

  it("puts the campaign purpose in the note, not the donor's private message", async () => {
    const order = await createCheckoutOrder("sri-temple", "annadanam-fund", "correct-token", {
      ...checkoutInput,
      donationMessage: "for my mother's health",
    });
    const params = new URLSearchParams((order?.upiUri ?? "").slice("upi://pay?".length));

    expect(params.get("tn")).toBe("Renovation Donation");
    // The message is still captured against the transaction for the temple.
    expect(vi.mocked(createPendingUpiTransaction).mock.calls[0][0].donorMessage).toBe("for my mother's health");
  });

  it("refuses to build a link when the temple has no VPA or payee name saved", async () => {
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue({ ...upiAccount, upiVpa: null });
    expect(await createCheckoutOrder("sri-temple", "annadanam-fund", "correct-token", checkoutInput)).toBeNull();

    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue({ ...upiAccount, payeeName: null });
    expect(await createCheckoutOrder("sri-temple", "annadanam-fund", "correct-token", checkoutInput)).toBeNull();
  });
});

describe("createCheckoutOrder — goal-reached blocking", () => {
  const checkoutInput = {
    amount: 100,
    donorName: "Test Donor",
    donorPhone: "9999999999",
    donorEmail: null,
    donorPan: null,
    donationMessage: null,
    isAnonymous: false,
  };

  beforeEach(() => {
    vi.mocked(getTenantBySlug).mockReset().mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockReset();
    vi.mocked(getCampaignDonationSummary).mockReset();
    vi.mocked(getActivePaymentAccountForTenant).mockReset().mockResolvedValue(account);
    vi.mocked(isProviderActive).mockReset().mockResolvedValue(true);
  });

  it("refuses to create an order once the goal has already been reached — the authoritative, fresh-checked block, not just a UI hint", async () => {
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ goalAmount: "1000" }));
    vi.mocked(getCampaignDonationSummary).mockResolvedValue({ totalAmount: 1000, donationCount: 1, donorCount: 1, lastDonationAt: null });
    const order = await createCheckoutOrder("sri-temple", "annadanam-fund", "correct-token", checkoutInput);
    expect(order).toBeNull();
  });

  it("still refuses once the goal has been exceeded (e.g. two near-simultaneous donations both captured)", async () => {
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ goalAmount: "1000" }));
    vi.mocked(getCampaignDonationSummary).mockResolvedValue({ totalAmount: 1200, donationCount: 2, donorCount: 2, lastDonationAt: null });
    const order = await createCheckoutOrder("sri-temple", "annadanam-fund", "correct-token", checkoutInput);
    expect(order).toBeNull();
  });

  it("judges an expired campaign by the public rules — order creation must never inherit an admin's preview access", async () => {
    vi.mocked(getTenantBySlug).mockResolvedValue(tenant);
    vi.mocked(getCampaignBySlugForTenant).mockResolvedValue(makeCampaign({ campaignEndDate: "2020-01-01" }));

    // The context still loads (the page renders), but the payment gate is shut.
    const loaded = await loadDonationCheckoutContext("sri-temple", "annadanam-fund", "correct-token");
    expect(loaded?.canDonate).toBe(false);
    expect(loaded?.blockedReason).toBe("expired");
  });
});
