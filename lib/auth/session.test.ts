import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("session token", () => {
  const payload = {
    adminId: "admin-1",
    tenantId: "tenant-1",
    phoneNumber: "+919876543210",
    displayName: "Test Admin",
  };

  it("round-trips a valid token", () => {
    const token = createSessionToken(payload);
    const verified = verifySessionToken(token);
    expect(verified).toMatchObject(payload);
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken(payload);
    const [payloadB64] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...payload, adminId: "attacker" }),
      "utf8",
    ).toString("base64url");
    const tampered = `${tamperedPayload}.${token.split(".")[1]}`;
    expect(verifySessionToken(tampered)).toBeNull();
    expect(payloadB64).not.toBe(tamperedPayload);
  });

  it("rejects a malformed token", () => {
    expect(verifySessionToken("not-a-real-token")).toBeNull();
    expect(verifySessionToken("")).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    const token = createSessionToken(payload);
    vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000); // past the 30-day expiry
    expect(verifySessionToken(token)).toBeNull();
  });
});
