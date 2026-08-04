import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { getCampaignDonationSummary, listCampaignDonations } from "./campaign-analytics";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

describe("getCampaignDonationSummary", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("counts every manual/anonymous donation (devotee_id IS NULL) as its own distinct donor — regression: count(DISTINCT devotee_id) alone silently zeroed out campaigns funded through the public donation link", async () => {
    query.mockResolvedValueOnce({ rows: [{ total: "5000", count: "3", donors: "3" }] });

    await getCampaignDonationSummary("tenant-1", "Temple Renovation");

    const [sql] = query.mock.calls[0];
    expect(String(sql)).toContain("COALESCE(devotee_id::text, id::text)");
  });

  it("returns zero gracefully when there are no matching donations", async () => {
    query.mockResolvedValueOnce({ rows: [{ total: "0", count: "0", donors: "0" }] });

    const summary = await getCampaignDonationSummary("tenant-1", "Nonexistent Purpose");

    expect(summary).toEqual({ totalAmount: 0, donationCount: 0, donorCount: 0 });
  });
});

describe("listCampaignDonations", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("LEFT JOINs devotees so manual/anonymous donations aren't silently dropped — regression: an INNER JOIN excluded every donation with devotee_id IS NULL even when getCampaignDonationSummary showed a non-zero total on the same page", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "d1",
          devotee_id: null,
          donor_name: "Walk-in Donor",
          amount: "500",
          payment_method: "cash",
          item_description: null,
          donated_at: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    });

    const donations = await listCampaignDonations("tenant-1", "Temple Renovation");

    const [sql] = query.mock.calls[0];
    expect(String(sql)).toContain("LEFT JOIN devotees");
    expect(donations).toEqual([
      {
        id: "d1",
        devoteeId: null,
        donorName: "Walk-in Donor",
        amount: "500",
        paymentMethod: "cash",
        itemDescription: null,
        donatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });
});
