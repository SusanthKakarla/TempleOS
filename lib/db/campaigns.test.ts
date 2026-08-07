import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { createCampaign, getCampaignByClientRequestId, type CreateCampaignInput } from "./campaigns";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const row = {
  id: "campaign-1",
  tenant_id: "tenant-1",
  title: "Annadanam Fund",
  description: null,
  campaign_type: "donation",
  status: "draft",
  channel: "whatsapp",
  template_key: null,
  custom_message: null,
  audience_filter: { type: "all" },
  banner_media_id: null,
  linked_event_id: null,
  linked_donation_purpose: "Annadanam Fund",
  schedule_type: "one_time",
  scheduled_at: null,
  recurrence_rule: null,
  next_run_at: null,
  last_run_at: null,
  goal_amount: "50000",
  campaign_start_date: null,
  campaign_end_date: null,
  closing_reminder_sent_at: null,
  target_reached_announced_at: null,
  slug: "annadanam-fund-abcd1234",
  donation_token: "tok",
  client_request_id: "11111111-1111-4111-8111-111111111111",
  created_by: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
};

const baseInput: CreateCampaignInput = {
  title: "Annadanam Fund",
  description: null,
  campaignType: "donation",
  channel: "whatsapp",
  templateKey: null,
  audienceFilter: { type: "all" },
  bannerMediaId: null,
  linkedEventId: null,
  scheduleType: "one_time",
  scheduledAt: null,
  recurrenceRule: null,
  goalAmount: "50000",
  campaignStartDate: null,
  campaignEndDate: null,
  clientRequestId: "11111111-1111-4111-8111-111111111111",
  createdBy: "member-1",
};

describe("createCampaign — clientRequestId", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("inserts the client-supplied clientRequestId so the DB's unique index can dedupe a concurrent duplicate submission", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    await createCampaign("tenant-1", baseInput);

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("client_request_id");
    expect(params).toContain("11111111-1111-4111-8111-111111111111");
  });

  it("passes null through when no clientRequestId is supplied (e.g. the duplicate-campaign route)", async () => {
    query.mockResolvedValueOnce({ rows: [{ ...row, client_request_id: null }] });

    await createCampaign("tenant-1", { ...baseInput, clientRequestId: null });

    const [, params] = query.mock.calls[0];
    expect(params).toContain(null);
  });
});

describe("getCampaignByClientRequestId", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("finds the winning campaign after a duplicate submission lost the unique-index race", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await getCampaignByClientRequestId("tenant-1", "11111111-1111-4111-8111-111111111111");

    expect(result?.id).toBe("campaign-1");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("client_request_id = $2"), [
      "tenant-1",
      "11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("returns null when no campaign matches", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const result = await getCampaignByClientRequestId("tenant-1", "not-a-real-id");

    expect(result).toBeNull();
  });
});
