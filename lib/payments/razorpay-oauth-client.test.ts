import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  isPartnerOnboardingConfigured,
  refreshAccessToken,
} from "./razorpay-oauth-client";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.RAZORPAY_PARTNER_CLIENT_ID = "partner_client_id";
  process.env.RAZORPAY_PARTNER_CLIENT_SECRET = "partner_client_secret";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("isPartnerOnboardingConfigured", () => {
  it("is true only when both client id and secret are set", () => {
    expect(isPartnerOnboardingConfigured()).toBe(true);
    delete process.env.RAZORPAY_PARTNER_CLIENT_SECRET;
    expect(isPartnerOnboardingConfigured()).toBe(false);
  });
});

describe("buildAuthorizeUrl", () => {
  it("builds the authorize URL with the signed state and redirect URI", () => {
    const url = buildAuthorizeUrl("signed-state-value", "https://temple.example.com/api/payments/oauth/callback");
    expect(url).toContain("https://auth.razorpay.com/authorize?");
    expect(url).toContain("client_id=partner_client_id");
    expect(url).toContain("state=signed-state-value");
    expect(url).toContain(encodeURIComponent("https://temple.example.com/api/payments/oauth/callback"));
  });

  it("throws when the Partner application isn't configured", () => {
    delete process.env.RAZORPAY_PARTNER_CLIENT_ID;
    expect(() => buildAuthorizeUrl("state", "https://example.com/callback")).toThrow(
      "RAZORPAY_PARTNER_CLIENT_ID is not configured",
    );
  });
});

describe("exchangeAuthorizationCode / refreshAccessToken", () => {
  it("exchanges a code for a token pair via the token endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "at_1",
        refresh_token: "rt_1",
        public_token: "pt_1",
        razorpay_account_id: "acc_1",
        expires_in: 7776000,
        token_type: "Bearer",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const tokens = await exchangeAuthorizationCode("auth_code", "https://temple.example.com/api/payments/oauth/callback");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://auth.razorpay.com/token",
      expect.objectContaining({ method: "POST" }),
    );
    const body = (fetchMock.mock.calls[0][1] as { body: string }).body;
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=auth_code");
    expect(tokens).toEqual({
      accessToken: "at_1",
      refreshToken: "rt_1",
      publicToken: "pt_1",
      razorpayAccountId: "acc_1",
      expiresInSeconds: 7776000,
    });
  });

  it("throws with the response body when the token endpoint rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "invalid_grant" }),
    );
    await expect(exchangeAuthorizationCode("bad_code", "https://example.com/callback")).rejects.toThrow("invalid_grant");
  });

  it("refreshAccessToken sends grant_type=refresh_token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "at_2",
        refresh_token: "rt_2",
        razorpay_account_id: "acc_1",
        expires_in: 7776000,
        token_type: "Bearer",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await refreshAccessToken("old_refresh_token");
    const body = (fetchMock.mock.calls[0][1] as { body: string }).body;
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=old_refresh_token");
  });
});
