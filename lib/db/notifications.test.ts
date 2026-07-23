import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { claimNotification, computeRetryState } from "./notifications";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

describe("computeRetryState", () => {
  it("schedules a retry 1 minute out after the 1st failure", () => {
    const before = Date.now();
    const { deliveryStatus, nextAttemptAt } = computeRetryState(1);
    expect(deliveryStatus).toBe("retrying");
    const deltaMs = nextAttemptAt!.getTime() - before;
    expect(deltaMs).toBeGreaterThan(55_000);
    expect(deltaMs).toBeLessThan(65_000);
  });

  it("schedules a retry 30 minutes out after the 3rd failure", () => {
    const before = Date.now();
    const { deliveryStatus, nextAttemptAt } = computeRetryState(3);
    expect(deliveryStatus).toBe("retrying");
    const deltaMs = nextAttemptAt!.getTime() - before;
    expect(deltaMs).toBeGreaterThan(1795_000);
    expect(deltaMs).toBeLessThan(1805_000);
  });

  it("marks the notification terminally failed after the 4th attempt", () => {
    const { deliveryStatus, nextAttemptAt } = computeRetryState(4);
    expect(deliveryStatus).toBe("failed");
    expect(nextAttemptAt).toBeNull();
  });

  it("stays terminally failed for any further attempt count", () => {
    expect(computeRetryState(5).deliveryStatus).toBe("failed");
  });
});

describe("claimNotification", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("atomically claims a due row and returns it", async () => {
    const row = {
      id: "n-1",
      tenant_id: "tenant-1",
      recipient_person_id: null,
      recipient_devotee_id: "devotee-1",
      notification_type: "birthday_devotee",
      channel: "whatsapp",
      category: "birthday",
      title: null,
      message: "Happy Birthday!",
      language: "en",
      metadata: {},
      media_id: null,
      provider_message_id: null,
      delivery_status: "queued",
      attempt_count: 0,
      next_attempt_at: new Date("2026-07-21T00:00:00Z"),
      sent_at: null,
      delivered_at: null,
      read_at: null,
      failure_reason: null,
      created_at: new Date("2026-07-21T00:00:00Z"),
      updated_at: new Date("2026-07-21T00:00:00Z"),
    };
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await claimNotification("n-1");

    expect(result?.id).toBe("n-1");
    expect(result?.deliveryStatus).toBe("queued");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = $1 AND delivery_status IN ('pending', 'retrying')"),
      ["n-1"],
    );
  });

  it("returns null when the row is already claimed or not due", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const result = await claimNotification("n-2");

    expect(result).toBeNull();
  });
});
