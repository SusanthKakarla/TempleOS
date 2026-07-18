import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createSignedSessionToken, verifySignedSessionToken } from "./session-token";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("signed session token", () => {
  it("round-trips a payload with the configured lifetime", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T00:00:00Z"));

    const token = createSignedSessionToken({ subject: "user-1" }, 60);
    const verified = verifySignedSessionToken<{ subject: string; exp: number }>(
      token,
      (payload): payload is { subject: string; exp: number } =>
        typeof payload === "object" &&
        payload !== null &&
        "subject" in payload &&
        "exp" in payload &&
        typeof payload.subject === "string" && typeof payload.exp === "number",
    );

    expect(verified).toEqual({
      subject: "user-1",
      exp: Date.now() + 60_000,
    });
  });

  it("rejects tampered, malformed, and expired tokens", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T00:00:00Z"));

    const token = createSignedSessionToken({ subject: "user-1" }, 60);
    const tamperedPayload = Buffer.from(
      JSON.stringify({ subject: "attacker", exp: Date.now() + 60_000 }),
      "utf8",
    ).toString("base64url");
    const tampered = `${tamperedPayload}.${token.split(".")[1]}`;

    const isPayload = (payload: unknown): payload is { subject: string; exp: number } =>
      typeof payload === "object" &&
      payload !== null &&
      "subject" in payload &&
      "exp" in payload &&
      typeof payload.subject === "string" &&
      typeof payload.exp === "number";

    expect(verifySignedSessionToken(tampered, isPayload)).toBeNull();
    expect(verifySignedSessionToken("not-a-real-token", isPayload)).toBeNull();
    expect(verifySignedSessionToken(`${token}.extra`, isPayload)).toBeNull();

    vi.advanceTimersByTime(61_000);
    expect(verifySignedSessionToken(token, isPayload)).toBeNull();
  });
});
