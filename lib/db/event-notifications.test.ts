import { describe, expect, it } from "vitest";
import { computeRetryState } from "./event-notifications";

describe("computeRetryState", () => {
  it("schedules a retry 1 minute out after the 1st failure", () => {
    const before = Date.now();
    const { deliveryStatus, nextAttemptAt } = computeRetryState(1);
    expect(deliveryStatus).toBe("retrying");
    expect(nextAttemptAt).not.toBeNull();
    const deltaMs = nextAttemptAt!.getTime() - before;
    expect(deltaMs).toBeGreaterThan(55_000);
    expect(deltaMs).toBeLessThan(65_000);
  });

  it("schedules a retry 5 minutes out after the 2nd failure", () => {
    const before = Date.now();
    const { deliveryStatus, nextAttemptAt } = computeRetryState(2);
    expect(deliveryStatus).toBe("retrying");
    const deltaMs = nextAttemptAt!.getTime() - before;
    expect(deltaMs).toBeGreaterThan(295_000);
    expect(deltaMs).toBeLessThan(305_000);
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
    expect(computeRetryState(10).deliveryStatus).toBe("failed");
  });
});
