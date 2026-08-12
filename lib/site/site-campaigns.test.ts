import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getPool } from "@/lib/db/pool";
import { listSiteCampaigns } from "./site-data";

vi.mock("@/lib/db/pool", () => ({ getPool: vi.fn() }));

const query = vi.fn();

beforeEach(() => {
  query.mockReset();
  (getPool as unknown as Mock).mockReturnValue({ query });
});

function campaignRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "campaign-1",
    title: "Temple renovation",
    description: "Rebuilding the eastern gopuram.",
    goal_amount: "100000",
    slug: "renovation",
    donation_token: "tok-abc",
    tenant_slug: "sivatemple",
    image_url: "https://media.example/banner.jpg",
    raised: "25000",
    ...overrides,
  };
}

describe("listSiteCampaigns", () => {
  it("scopes every campaign to the tenant resolved from the hostname", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await listSiteCampaigns("tenant-1", "Asia/Kolkata");

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("c.tenant_id = $1");
    expect((params as unknown[])[0]).toBe("tenant-1");
  });

  /*
   * Relative, so the donor stays on the temple's own hostname. The absolute
   * builder used for WhatsApp resolves against DONATION_LINK_BASE_URL, which
   * falls back to the demo host — following that from a temple's own site
   * would hand the donation to a different domain mid-flow.
   */
  it("sends donors into the existing checkout on this temple's own hostname", async () => {
    query.mockResolvedValueOnce({ rows: [campaignRow()] });

    const [campaign] = await listSiteCampaigns("tenant-1", "Asia/Kolkata");

    expect(campaign.donateUrl).toBe("/donate/sivatemple/renovation/tok-abc");
  });

  it("reports progress from the donations already recorded against the campaign's purpose", async () => {
    query.mockResolvedValueOnce({ rows: [campaignRow()] });

    const [campaign] = await listSiteCampaigns("tenant-1", "Asia/Kolkata");

    expect(campaign).toMatchObject({ goalAmount: 100000, raisedAmount: 25000 });
    expect(String(query.mock.calls[0][0])).toContain("d.purpose = c.linked_donation_purpose");
  });

  it("excludes refunded donations from the raised total, as the admin analytics do", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await listSiteCampaigns("tenant-1", "Asia/Kolkata");
    expect(String(query.mock.calls[0][0])).toContain("pt.status != 'refunded'");
  });

  it("hides campaigns a devotee could not give to", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await listSiteCampaigns("tenant-1", "Asia/Kolkata");

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("c.status NOT IN ('archived', 'cancelled', 'paused')");
    // Without a goal or a purpose tag the progress bar would read zero forever.
    expect(sql).toContain("c.goal_amount > 0");
    expect(sql).toContain("c.linked_donation_purpose IS NOT NULL");
  });

  /*
   * Both bounds are inclusive calendar days in the temple's own timezone, so a
   * campaign ending today is still listed for the whole of today rather than
   * vanishing at 05:30 local time — the same rule the donation page applies.
   */
  it("bounds the campaign window by the temple's local calendar date", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await listSiteCampaigns("tenant-1", "Asia/Kolkata");

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("c.campaign_start_date <= $2::date");
    expect(sql).toContain("c.campaign_end_date >= $2::date");
    expect(typeof (query.mock.calls[0][1] as unknown[])[1]).toBe("string");
  });
});
