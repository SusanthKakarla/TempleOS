import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { createAuditLogEntry } from "./audit-log";
import { countDonationsFiltered, deleteDonation, getDashboardDonationStats, listDonations } from "./donations";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));
vi.mock("./audit-log", () => ({ createAuditLogEntry: vi.fn() }));

describe("donations purpose filter", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("adds a purpose condition and param to listDonations when purpose is set", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await listDonations("tenant-1", { purpose: "Seva" });

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("d.purpose = $2");
    expect(params).toEqual(["tenant-1", "Seva"]);
  });

  it("omits the purpose condition when purpose is not set", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await listDonations("tenant-1", {});

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).not.toContain("d.purpose");
    expect(params).toEqual(["tenant-1"]);
  });

  it("applies the same purpose condition in countDonationsFiltered", async () => {
    query.mockResolvedValueOnce({ rows: [{ count: "3" }] });

    const count = await countDonationsFiltered("tenant-1", { purpose: "Annadanam (Food Offering)" });

    expect(count).toBe(3);
    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("d.purpose = $2");
    expect(params).toEqual(["tenant-1", "Annadanam (Food Offering)"]);
  });
});

describe("getDashboardDonationStats", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("returns the unfiltered all-time sum/count when no filter is given", async () => {
    query.mockResolvedValueOnce({ rows: [{ total: "752350", count: "113" }] });

    const stats = await getDashboardDonationStats("tenant-1");

    expect(stats).toEqual({ total: "752350", count: 113 });
    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).not.toContain("d.donated_at");
    expect(String(sql)).not.toContain("dev.display_name");
    expect(params).toEqual(["tenant-1"]);
  });

  it(
    "supports a search filter (joins devotees so dev.display_name/whatsapp_phone can match) — this is what " +
      "the Donations page's 'Total Filtered Amount' summary card relies on to stay in sync with a text search, " +
      "not just date range/purpose",
    async () => {
      query.mockResolvedValueOnce({ rows: [{ total: "5000", count: "2" }] });

      await getDashboardDonationStats("tenant-1", { search: "Ravi" });

      const [sql, params] = query.mock.calls[0];
      expect(String(sql)).toContain("LEFT JOIN devotees dev");
      expect(String(sql)).toContain("dev.display_name ILIKE");
      expect(params).toEqual(["tenant-1", "%Ravi%"]);
    },
  );

  it("combines search + date range + purpose into a single aggregate query — matches whatever combination of filters the table applies", async () => {
    query.mockResolvedValueOnce({ rows: [{ total: "1200", count: "3" }] });

    await getDashboardDonationStats("tenant-1", {
      search: "Lakshmi",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      purpose: "Seva",
    });

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("d.donated_at >=");
    expect(String(sql)).toContain("d.donated_at <=");
    expect(String(sql)).toContain("d.purpose =");
    expect(params).toEqual(["tenant-1", "%Lakshmi%", "2026-01-01", "2026-01-31", "Seva"]);
  });

  it("returns zero gracefully when nothing matches the filter (e.g. no donations for the searched term)", async () => {
    query.mockResolvedValueOnce({ rows: [{ total: "0", count: "0" }] });

    const stats = await getDashboardDonationStats("tenant-1", { search: "nonexistent-donor-xyz" });

    expect(stats).toEqual({ total: "0", count: 0 });
  });
});

describe("deleteDonation audit logging", () => {
  const client = { query: vi.fn(), release: vi.fn() };

  beforeEach(() => {
    client.query.mockReset();
    client.release.mockReset();
    vi.mocked(createAuditLogEntry).mockReset();
    (getPool as unknown as Mock).mockReturnValue({ connect: vi.fn().mockResolvedValue(client) });
  });

  it("records a donation.deleted audit entry with payment links in the same transaction", async () => {
    const donatedAt = new Date("2026-08-01T08:10:00.000Z");
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: "payment-1" }, { id: "payment-2" }] }) // linked payments
      .mockResolvedValueOnce({
        rows: [
          {
            id: "donation-1",
            tenant_id: "tenant-1",
            devotee_id: "devotee-1",
            amount: "101.00",
            purpose: "General Donation",
            payment_method: "razorpay",
            notes: null,
            donated_at: donatedAt,
            recorded_by: "recorder-1",
            manual_donor_name: null,
            manual_donor_phone: null,
            manual_donor_email: null,
            manual_donor_address: null,
            is_anonymous: false,
            item_description: null,
            created_at: donatedAt,
            updated_at: donatedAt,
          },
        ],
      }) // deleted donation
      .mockResolvedValueOnce(undefined) // recompute devotee cache
      .mockResolvedValueOnce(undefined); // COMMIT
    vi.mocked(createAuditLogEntry).mockResolvedValue({} as never);

    const deleted = await deleteDonation("tenant-1", "donation-1", "actor-membership");

    expect(deleted).toBe(true);
    expect(createAuditLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: "tenant_member",
        actorId: "actor-membership",
        tenantId: "tenant-1",
        action: "donation.deleted",
        targetType: "donation",
        targetId: "donation-1",
        metadata: expect.objectContaining({
          amount: "101.00",
          purpose: "General Donation",
          paymentMethod: "razorpay",
          donorSource: "devotee",
          devoteeId: "devotee-1",
          linkedPaymentTransactionIds: ["payment-1", "payment-2"],
        }),
      }),
      client,
    );
    expect(client.query).toHaveBeenLastCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back and skips audit logging when the donation is not found", async () => {
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // linked payments
      .mockResolvedValueOnce({ rows: [] }) // delete
      .mockResolvedValueOnce(undefined); // ROLLBACK

    const deleted = await deleteDonation("tenant-1", "missing-donation", "actor-membership");

    expect(deleted).toBe(false);
    expect(createAuditLogEntry).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
