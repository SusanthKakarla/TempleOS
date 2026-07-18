import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TENANT_SESSION_MAX_AGE_SECONDS, createSessionToken, verifySessionToken } from "./session";

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
    vi.advanceTimersByTime((TENANT_SESSION_MAX_AGE_SECONDS + 1) * 1000);
    expect(verifySessionToken(token)).toBeNull();
  });

  it("uses a 7-day tenant dashboard lifetime", () => {
    expect(TENANT_SESSION_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 7);
  });
});
