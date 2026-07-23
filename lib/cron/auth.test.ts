import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./auth";

function requestWithAuthHeader(value: string | null) {
  return { headers: { get: (name: string) => (name === "authorization" ? value : null) } } as never;
}

describe("isAuthorizedCronRequest", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("accepts the exact configured bearer secret", () => {
    expect(isAuthorizedCronRequest(requestWithAuthHeader("Bearer test-cron-secret"))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    expect(isAuthorizedCronRequest(requestWithAuthHeader("Bearer wrong-secret"))).toBe(false);
  });

  it("rejects a missing authorization header", () => {
    expect(isAuthorizedCronRequest(requestWithAuthHeader(null))).toBe(false);
  });

  it("rejects when CRON_SECRET is not configured", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCronRequest(requestWithAuthHeader("Bearer test-cron-secret"))).toBe(false);
  });

  it("rejects a header of a different length without throwing", () => {
    expect(isAuthorizedCronRequest(requestWithAuthHeader("Bearer short"))).toBe(false);
  });
});
