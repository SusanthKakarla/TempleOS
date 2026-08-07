import { beforeEach, describe, expect, it, vi } from "vitest";
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
      .mockResolvedValue({ totalAmount: 0, donationCount: 0, donorCount: 0 });
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

describe("loadDonationCheckoutContext", () => {
  beforeEach(() => {
    vi.mocked(getTenantBySlug).mockReset();
    vi.mocked(getCampaignBySlugForTenant).mockReset();
    vi.mocked(getCampaignDonationSummary)
      .mockReset()
      .mockResolvedValue({ totalAmount: 0, donationCount: 0, donorCount: 0 });
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
