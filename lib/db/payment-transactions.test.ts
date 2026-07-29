import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { listCapturedTransactionsMissingDonation, markTransactionCapturedIfNotAlready } from "./payment-transactions";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const baseRow = {
  id: "txn-1",
  tenant_id: "tenant-1",
  payment_account_id: "acct-1",
  campaign_id: null,
  donation_id: null,
  provider_key: "razorpay",
  provider_order_id: "order_1",
  provider_payment_id: "pay_1",
  amount: "500.00",
  currency: "INR",
  status: "captured",
  donor_name: "Ravi",
  donor_phone: null,
  donor_email: null,
  is_anonymous: false,
  receipt_number: null,
  receipt_url: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
};

describe("markTransactionCapturedIfNotAlready", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("guards the transition with a status <> 'captured' WHERE clause (idempotent CAS)", async () => {
    query.mockResolvedValueOnce({ rows: [baseRow] });
    await markTransactionCapturedIfNotAlready("txn-1", "pay_1");

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("status <> 'captured'");
    expect(String(sql)).toContain("SET status = 'captured'");
    expect(params).toEqual(["txn-1", "pay_1"]);
  });

  it("returns the mapped transaction when the row was actually transitioned", async () => {
    query.mockResolvedValueOnce({ rows: [baseRow] });
    const result = await markTransactionCapturedIfNotAlready("txn-1", "pay_1");
    expect(result?.id).toBe("txn-1");
    expect(result?.status).toBe("captured");
    expect(result?.amount).toBe(500);
  });

  it("returns null when the row was already captured (a redelivered webhook event) — no rows come back", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const result = await markTransactionCapturedIfNotAlready("txn-1", "pay_1");
    expect(result).toBeNull();
  });
});

describe("listCapturedTransactionsMissingDonation", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("filters to captured transactions with no donation attached, stale past the given threshold", async () => {
    query.mockResolvedValueOnce({ rows: [baseRow] });
    await listCapturedTransactionsMissingDonation("tenant-1", 15);

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("status = 'captured'");
    expect(String(sql)).toContain("donation_id IS NULL");
    expect(String(sql)).toContain("updated_at < now()");
    expect(params).toEqual(["tenant-1", 15]);
  });

  it("maps the returned rows to PaymentTransaction objects", async () => {
    query.mockResolvedValueOnce({ rows: [baseRow] });
    const result = await listCapturedTransactionsMissingDonation("tenant-1", 15);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("txn-1");
    expect(result[0].donationId).toBeNull();
  });
});
