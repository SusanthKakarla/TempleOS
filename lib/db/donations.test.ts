import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { createAuditLogEntry } from "./audit-log";
import {
  countDonationsFiltered,
  createDonationWithNewDevotee,
  deleteDonation,
  getDashboardDonationStats,
  listDonations,
  listDonationsForExport,
} from "./donations";

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

describe("listDonationsForExport", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it(
    "joins payment_transactions (via a LATERAL + LIMIT 1, so a donation can never be duplicated even if " +
      "more than one transaction row references it) and campaigns, exposing the Transaction ID/Payment " +
      "Status/Receipt Number/Campaign columns the export column picker offers but the table itself never fetches",
    async () => {
      const now = new Date("2026-08-01T00:00:00.000Z");
      query.mockResolvedValueOnce({
        rows: [
          {
            id: "donation-1",
            tenant_id: "tenant-1",
            devotee_id: "devotee-1",
            amount: "501.00",
            purpose: "General Donation",
            payment_method: "razorpay",
            notes: null,
            donated_at: now,
            recorded_by: null,
            manual_donor_name: null,
            manual_donor_phone: null,
            manual_donor_email: null,
            manual_donor_address: null,
            is_anonymous: false,
            item_description: null,
            created_at: now,
            updated_at: now,
            donor_name: "Gopala Krishna",
            donor_phone: "+919876543210",
            provider_payment_id: "pay_ABC123",
            payment_status: "captured",
            receipt_number: "RCPT-0001",
            campaign_title: "Annual Fundraiser 2026",
          },
        ],
      });

      const rows = await listDonationsForExport("tenant-1", {});

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: "donation-1",
        providerPaymentId: "pay_ABC123",
        paymentStatus: "captured",
        receiptNumber: "RCPT-0001",
        campaignTitle: "Annual Fundraiser 2026",
      });

      const [sql] = query.mock.calls[0];
      expect(String(sql)).toContain("LEFT JOIN LATERAL");
      expect(String(sql)).toContain("FROM payment_transactions pt");
      expect(String(sql)).toContain("LIMIT 1");
      expect(String(sql)).toContain("LEFT JOIN campaigns c ON c.id = pt.campaign_id");
    },
  );

  it("returns null for the payment/campaign columns on a manual-donor donation with no payment_transactions row", async () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "donation-2",
          tenant_id: "tenant-1",
          devotee_id: null,
          amount: "250.00",
          purpose: "General Donation",
          payment_method: "cash",
          notes: null,
          donated_at: now,
          recorded_by: null,
          manual_donor_name: "Walk-in Donor",
          manual_donor_phone: null,
          manual_donor_email: null,
          manual_donor_address: null,
          is_anonymous: false,
          item_description: null,
          created_at: now,
          updated_at: now,
          donor_name: "Walk-in Donor",
          donor_phone: null,
          provider_payment_id: null,
          payment_status: null,
          receipt_number: null,
          campaign_title: null,
        },
      ],
    });

    const rows = await listDonationsForExport("tenant-1", {});

    expect(rows[0]).toMatchObject({
      providerPaymentId: null,
      paymentStatus: null,
      receiptNumber: null,
      campaignTitle: null,
    });
  });

  it("shares buildDonationConditions with listDonations — the same filters apply (e.g. purpose)", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await listDonationsForExport("tenant-1", { purpose: "Seva" });

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("d.purpose = $2");
    expect(params).toEqual(["tenant-1", "Seva"]);
  });
});

describe(
  "donation date range filtering — inclusive boundaries",
  () => {
    const query = vi.fn();

    beforeEach(() => {
      query.mockReset();
      (getPool as unknown as Mock).mockReturnValue({ query });
    });

    it(
      "regression: To Date must include the ENTIRE day, not just midnight — comparing " +
        "donated_at (timestamptz) with `<= dateTo` implicitly casts dateTo to 00:00:00 of " +
        "that day, silently excluding every donation recorded later that day (manual, " +
        "imported, or online — all share this one query). The fix casts dateTo to `::date` " +
        "and uses an exclusive upper bound at the START OF THE NEXT DAY instead.",
      async () => {
        query.mockResolvedValueOnce({ rows: [] });

        await listDonations("tenant-1", { dateFrom: "2026-08-01", dateTo: "2026-08-05" });

        const [sql, params] = query.mock.calls[0];
        expect(String(sql)).toContain("d.donated_at >= $2::date");
        expect(String(sql)).toContain("d.donated_at < ($3::date + INTERVAL '1 day')");
        expect(String(sql)).not.toContain("d.donated_at <= $3");
        expect(params).toEqual(["tenant-1", "2026-08-01", "2026-08-05"]);
      },
    );

    it("applies the same inclusive dateTo bound in countDonationsFiltered", async () => {
      query.mockResolvedValueOnce({ rows: [{ count: "5" }] });

      const count = await countDonationsFiltered("tenant-1", { dateFrom: "2026-08-01", dateTo: "2026-08-05" });

      expect(count).toBe(5);
      const [sql, params] = query.mock.calls[0];
      expect(String(sql)).toContain("d.donated_at < ($3::date + INTERVAL '1 day')");
      expect(params).toEqual(["tenant-1", "2026-08-01", "2026-08-05"]);
    });

    it("applies the same inclusive dateTo bound in getDashboardDonationStats (the Donations page's 'Total Filtered Amount' card)", async () => {
      query.mockResolvedValueOnce({ rows: [{ total: "0", count: "0" }] });

      await getDashboardDonationStats("tenant-1", { dateFrom: "2026-08-01", dateTo: "2026-08-05" });

      const [sql] = query.mock.calls[0];
      expect(String(sql)).toContain("d.donated_at < ($3::date + INTERVAL '1 day')");
    });

    it("supports a From-Date-only range (no dateTo) — every donation from that date onward", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await listDonations("tenant-1", { dateFrom: "2026-08-01" });

      const [sql, params] = query.mock.calls[0];
      expect(String(sql)).toContain("d.donated_at >= $2::date");
      expect(String(sql)).not.toContain("donated_at <");
      expect(params).toEqual(["tenant-1", "2026-08-01"]);
    });

    it("supports a To-Date-only range (no dateFrom) — every donation up to and including that date", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await listDonations("tenant-1", { dateTo: "2026-08-05" });

      const [sql, params] = query.mock.calls[0];
      expect(String(sql)).toContain("d.donated_at < ($2::date + INTERVAL '1 day')");
      expect(String(sql)).not.toContain("donated_at >=");
      expect(params).toEqual(["tenant-1", "2026-08-05"]);
    });
  },
);

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
    expect(String(sql)).toContain("d.donated_at >= $3::date");
    expect(String(sql)).toContain("d.donated_at < ($4::date + INTERVAL '1 day')");
    expect(String(sql)).toContain("d.purpose =");
    expect(params).toEqual(["tenant-1", "%Lakshmi%", "2026-01-01", "2026-01-31", "Seva"]);
  });

  it("returns zero gracefully when nothing matches the filter (e.g. no donations for the searched term)", async () => {
    query.mockResolvedValueOnce({ rows: [{ total: "0", count: "0" }] });

    const stats = await getDashboardDonationStats("tenant-1", { search: "nonexistent-donor-xyz" });

    expect(stats).toEqual({ total: "0", count: 0 });
  });
});

describe("createDonationWithNewDevotee", () => {
  const client = { query: vi.fn(), release: vi.fn() };

  beforeEach(() => {
    client.query.mockReset();
    client.release.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ connect: vi.fn().mockResolvedValue(client) });
  });

  it(
    "creates the devotee and the donation in one transaction, linking the donation to the new devotee's id — " +
      "the 'smart donor search' no-match path (temple staff type a name/phone, nothing matches, they record the " +
      "donation anyway) must never leave a devotee with no donation or a donation with no devotee if either insert fails",
    async () => {
      const now = new Date("2026-08-01T08:10:00.000Z");
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: "devotee-new",
              tenant_id: "tenant-1",
              whatsapp_phone: "+919876543210",
              display_name: "Gopala Krishna",
              date_of_birth: null,
              birth_star: null,
              ancestral_lineage: null,
              whatsapp_opt_in_status: true,
              gender: null,
              marital_status: null,
              wedding_anniversary: null,
              family_id: null,
              is_active: true,
              is_donor: false,
              total_donated_amount: "0",
              last_donation_at: null,
              first_seen_at: now,
              last_seen_at: now,
              last_interaction_type: null,
              preferred_language: null,
              address: null,
              notes: null,
              event_notifications_enabled: true,
              created_at: now,
              updated_at: now,
              family_name: null,
              relationship: null,
            },
          ],
        }) // devotee INSERT (via createDevotee, sharing this same client)
        .mockResolvedValueOnce({
          rows: [
            {
              id: "donation-new",
              tenant_id: "tenant-1",
              devotee_id: "devotee-new",
              amount: "501.00",
              purpose: "General Donation",
              payment_method: "cash",
              notes: null,
              donated_at: now,
              recorded_by: "recorder-1",
              manual_donor_name: null,
              manual_donor_phone: null,
              manual_donor_email: null,
              manual_donor_address: null,
              is_anonymous: false,
              item_description: null,
              created_at: now,
              updated_at: now,
            },
          ],
        }) // donation INSERT
        .mockResolvedValueOnce(undefined) // recompute devotee cache
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await createDonationWithNewDevotee("tenant-1", {
        devotee: { displayName: "Gopala Krishna", whatsappPhone: "+919876543210", gender: null, dateOfBirth: null },
        donation: {
          amount: 501,
          purpose: "General Donation",
          paymentMethod: "cash",
          itemDescription: null,
          notes: null,
          donatedAt: now.toISOString(),
          recordedBy: "recorder-1",
        },
      });

      expect(result.devotee.id).toBe("devotee-new");
      expect(result.donation.devoteeId).toBe("devotee-new");
      expect(result.donation.id).toBe("donation-new");

      const donationInsertCall = client.query.mock.calls[2];
      expect(String(donationInsertCall[0])).toContain("INSERT INTO donations");
      expect(donationInsertCall[1]).toContain("devotee-new");

      expect(client.query).toHaveBeenLastCalledWith("COMMIT");
      expect(client.release).toHaveBeenCalledOnce();
    },
  );

  it("rolls back the devotee insert too if the donation insert fails — no orphaned devotee left behind", async () => {
    const now = new Date("2026-08-01T08:10:00.000Z");
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: "devotee-new",
            tenant_id: "tenant-1",
            whatsapp_phone: "+919876543210",
            display_name: "Gopala Krishna",
            date_of_birth: null,
            birth_star: null,
            ancestral_lineage: null,
            whatsapp_opt_in_status: true,
            gender: null,
            marital_status: null,
            wedding_anniversary: null,
            family_id: null,
            is_active: true,
            is_donor: false,
            total_donated_amount: "0",
            last_donation_at: null,
            first_seen_at: now,
            last_seen_at: now,
            last_interaction_type: null,
            preferred_language: null,
            address: null,
            notes: null,
            event_notifications_enabled: true,
            created_at: now,
            updated_at: now,
            family_name: null,
            relationship: null,
          },
        ],
      }) // devotee INSERT succeeds
      .mockRejectedValueOnce(new Error("donation insert failed")) // donation INSERT fails
      .mockResolvedValueOnce(undefined); // ROLLBACK

    await expect(
      createDonationWithNewDevotee("tenant-1", {
        devotee: { displayName: "Gopala Krishna", whatsappPhone: "+919876543210", gender: null, dateOfBirth: null },
        donation: {
          amount: 501,
          purpose: "General Donation",
          paymentMethod: "cash",
          itemDescription: null,
          notes: null,
          donatedAt: now.toISOString(),
          recordedBy: "recorder-1",
        },
      }),
    ).rejects.toThrow("donation insert failed");

    expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
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
