import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { getTemplate } from "./notification-templates";
import { getCampaignDonationSummary } from "./campaign-analytics";
import { enqueueCampaignBroadcast } from "./campaign-broadcasts";
import type { Campaign, Tenant } from "@/types/db";

vi.mock("./pool", () => ({ getPool: vi.fn() }));
vi.mock("./notification-templates", () => ({ getTemplate: vi.fn(), renderTemplate: vi.fn((body: string) => body) }));
vi.mock("./campaign-analytics", () => ({ getCampaignDonationSummary: vi.fn() }));

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
    title: "Diwali Wishes",
    description: null,
    campaignType: "festival",
    status: "running",
    channel: "whatsapp",
    templateKey: null,
    customMessage: null,
    audienceFilter: { type: "all" },
    bannerMediaId: null,
    linkedEventId: null,
    linkedDonationPurpose: null,
    scheduleType: "one_time",
    scheduledAt: null,
    recurrenceRule: null,
    nextRunAt: null,
    lastRunAt: null,
    goalAmount: null,
    campaignStartDate: null,
    campaignEndDate: null,
    closingReminderSentAt: null,
    targetReachedAnnouncedAt: null,
    slug: "diwali-wishes",
    donationToken: "token-abc",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("enqueueCampaignBroadcast — notification_type storage regression guard", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset().mockResolvedValue({ rows: [{ id: "notif-1" }] });
    (getPool as unknown as Mock).mockReturnValue({ query });
    vi.mocked(getTemplate).mockReset();
    vi.mocked(getCampaignDonationSummary).mockReset();
  });

  it("stores the campaign's own templateKey as notification_type, not the generic 'campaign_broadcast' default — otherwise delivery looks up the wrong Meta template once the 24h window closes", async () => {
    vi.mocked(getTemplate).mockResolvedValue({
      id: "t-1",
      notificationType: "festival_greeting",
      channel: "whatsapp",
      language: "en",
      title: null,
      body: "Happy {{campaignTitle}}!",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await enqueueCampaignBroadcast(tenant, makeCampaign({ templateKey: "festival_greeting" }));

    const insertCall = query.mock.calls[0];
    const params = insertCall[1] as unknown[];
    // notification_type is bound param $2 in the INSERT ... SELECT statement.
    expect(params[1]).toBe("festival_greeting");
  });

  it("still stores the generic 'campaign_broadcast' default when no templateKey is set (plain custom-message campaign)", async () => {
    await enqueueCampaignBroadcast(tenant, makeCampaign({ customMessage: "Temple closed tomorrow for cleaning." }));

    const insertCall = query.mock.calls[0];
    const params = insertCall[1] as unknown[];
    expect(params[1]).toBe("campaign_broadcast");
  });

  it("still stores 'donation_campaign_broadcast' for a donation-ready campaign (unaffected by this fix)", async () => {
    vi.mocked(getTemplate).mockResolvedValue({
      id: "t-2",
      notificationType: "donation_campaign_broadcast",
      channel: "whatsapp",
      language: "en",
      title: null,
      body: "Raised {{raisedAmount}} of {{goalAmount}}",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    vi.mocked(getCampaignDonationSummary).mockResolvedValue({
      totalAmount: 5000,
      donationCount: 2,
      donorCount: 2,
      lastDonationAt: "2026-01-02T00:00:00.000Z",
    });

    const donationCampaign = makeCampaign({
      campaignType: "donation",
      goalAmount: "10000",
      campaignStartDate: "2026-01-01",
      campaignEndDate: "2026-02-01",
      linkedDonationPurpose: "annadanam",
    });

    await enqueueCampaignBroadcast(tenant, donationCampaign);

    const insertCall = query.mock.calls[0];
    const params = insertCall[1] as unknown[];
    expect(params[1]).toBe("donation_campaign_broadcast");
  });
});
