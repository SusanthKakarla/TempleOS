import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueCampaignBroadcast } from "@/lib/db/campaign-broadcasts";
import { processNotifications } from "@/lib/notifications/delivery";
import { updateCampaignStatus } from "@/lib/db/campaigns";
import { getCampaignDeliverySummary } from "@/lib/db/campaign-analytics";
import { runCampaignNow } from "./run-campaign";
import type { Campaign, Tenant } from "@/types/db";

vi.mock("@/lib/db/campaign-broadcasts", () => ({ enqueueCampaignBroadcast: vi.fn() }));
vi.mock("@/lib/notifications/delivery", () => ({ processNotifications: vi.fn() }));
vi.mock("@/lib/db/campaigns", () => ({ updateCampaignStatus: vi.fn() }));
vi.mock("@/lib/db/campaign-analytics", () => ({ getCampaignDeliverySummary: vi.fn() }));

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
    status: "draft",
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
    campaignStartDate: "2026-01-01T00:00:00.000Z",
    campaignEndDate: "2099-01-01T00:00:00.000Z",
    donationLinkOverride: null,
    closingReminderSentAt: null,
    targetReachedAnnouncedAt: null,
    slug: "annadanam-fund",
    donationToken: "token-abc",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("runCampaignNow", () => {
  beforeEach(() => {
    vi.mocked(enqueueCampaignBroadcast).mockReset().mockResolvedValue(["notif-1"]);
    vi.mocked(processNotifications).mockReset().mockResolvedValue(undefined);
    vi.mocked(updateCampaignStatus)
      .mockReset()
      .mockResolvedValue(null as never);
    vi.mocked(getCampaignDeliverySummary)
      .mockReset()
      .mockResolvedValue({ sent: 1, failed: 0, recipients: 1, queued: 0, delivered: 1, retrying: 0 });
  });

  it("leaves a one-time donation campaign in 'running' after the broadcast sends — it must stay open for donations for its whole campaignEndDate window, not close the instant the announcement is sent", async () => {
    const campaign = makeCampaign({ campaignType: "donation", scheduleType: "one_time" });

    const result = await runCampaignNow(tenant, campaign);

    expect(result.ok).toBe(true);
    // Only the initial "running" transition should ever be called — no
    // second call flipping it to "completed".
    expect(updateCampaignStatus).toHaveBeenCalledTimes(1);
    expect(updateCampaignStatus).toHaveBeenCalledWith(
      "tenant-1",
      "campaign-1",
      "running",
      expect.objectContaining({ lastRunAt: expect.any(String) }),
    );
    expect(updateCampaignStatus).not.toHaveBeenCalledWith("tenant-1", "campaign-1", "completed", expect.anything());
  });

  it("leaves a recurring donation campaign in 'running' too, not 'scheduled', after the broadcast sends", async () => {
    const campaign = makeCampaign({
      campaignType: "donation",
      scheduleType: "recurring",
      recurrenceRule: "FREQ=WEEKLY",
    });

    await runCampaignNow(tenant, campaign);

    expect(updateCampaignStatus).toHaveBeenCalledTimes(1);
    expect(updateCampaignStatus).not.toHaveBeenCalledWith("tenant-1", "campaign-1", "scheduled", expect.anything());
  });

  it("still marks a non-donation one-time campaign as 'completed' after sending (unchanged existing behavior)", async () => {
    const campaign = makeCampaign({ campaignType: "festival", scheduleType: "one_time" });

    await runCampaignNow(tenant, campaign);

    expect(updateCampaignStatus).toHaveBeenCalledTimes(2);
    expect(updateCampaignStatus).toHaveBeenLastCalledWith("tenant-1", "campaign-1", "completed", { nextRunAt: null });
  });

  it("still reschedules a non-donation recurring campaign back to 'scheduled' (unchanged existing behavior)", async () => {
    const campaign = makeCampaign({
      campaignType: "festival",
      scheduleType: "recurring",
      recurrenceRule: "FREQ=WEEKLY",
    });

    await runCampaignNow(tenant, campaign);

    expect(updateCampaignStatus).toHaveBeenCalledTimes(2);
    const lastCall = vi.mocked(updateCampaignStatus).mock.calls[1];
    expect(lastCall[0]).toBe("tenant-1");
    expect(lastCall[1]).toBe("campaign-1");
    expect(lastCall[2]).toBe("scheduled");
  });
});
