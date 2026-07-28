import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createOAuthState, verifyOAuthState } from "./oauth-handoff";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Razorpay OAuth connect state token", () => {
  it("round-trips tenantId/membershipId through create/verify", () => {
    const state = createOAuthState({ tenantId: "tenant-1", membershipId: "member-1" });
    const verified = verifyOAuthState(state);
    expect(verified).toMatchObject({ tenantId: "tenant-1", membershipId: "member-1" });
  });

  it("rejects a tampered state value", () => {
    const state = createOAuthState({ tenantId: "tenant-1", membershipId: "member-1" });
    const tampered = state.slice(0, -1) + (state.endsWith("A") ? "B" : "A");
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("rejects an expired state value", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const state = createOAuthState({ tenantId: "tenant-1", membershipId: "member-1" });

    vi.setSystemTime(new Date("2026-01-01T00:15:00Z")); // past the 10-minute window
    expect(verifyOAuthState(state)).toBeNull();
  });

  it("rejects garbage input instead of throwing", () => {
    expect(verifyOAuthState("not-a-real-token")).toBeNull();
  });
});
