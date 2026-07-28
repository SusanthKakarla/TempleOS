import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { upsertRefundStatusFromWebhook } from "./payment-refunds";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const baseRow = {
  id: "refund-1",
  tenant_id: "tenant-1",
  transaction_id: "txn-1",
  provider_refund_id: "rfnd_123",
  amount: "100.00",
  status: "processed",
  reason: null,
  initiated_by: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
};

describe("upsertRefundStatusFromWebhook", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("upserts by provider_refund_id with a status-transition guard (idempotent CAS)", async () => {
    query.mockResolvedValueOnce({ rows: [baseRow] });
    await upsertRefundStatusFromWebhook("tenant-1", "txn-1", "rfnd_123", 100, "processed");

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("ON CONFLICT (provider_refund_id) DO UPDATE");
    expect(String(sql)).toContain("WHERE payment_refunds.status <> EXCLUDED.status");
    expect(params).toEqual(["tenant-1", "txn-1", "rfnd_123", 100, "processed"]);
  });

  it("returns null (no-op) when the redelivered event reports the same status already stored", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const result = await upsertRefundStatusFromWebhook("tenant-1", "txn-1", "rfnd_123", 100, "processed");
    expect(result).toBeNull();
  });

  it("returns the row when a fresh status transition actually occurred", async () => {
    query.mockResolvedValueOnce({ rows: [baseRow] });
    const result = await upsertRefundStatusFromWebhook("tenant-1", "txn-1", "rfnd_123", 100, "processed");
    expect(result?.status).toBe("processed");
    expect(result?.amount).toBe(100);
  });
});
