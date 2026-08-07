import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAMPAIGN_PREVIEW_TOKEN_MAX_AGE_SECONDS,
  createCampaignPreviewToken,
  verifyCampaignPreviewToken,
} from "./campaign-preview-token";

describe("campaign preview token", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-for-preview-tokens";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies for the exact tenant + campaign it was issued for", () => {
    const token = createCampaignPreviewToken("sri-temple", "annadanam-fund");
    expect(verifyCampaignPreviewToken(token, "sri-temple", "annadanam-fund")).toBe(true);
  });

  it("refuses to be replayed against another campaign or another temple", () => {
    const token = createCampaignPreviewToken("sri-temple", "annadanam-fund");

    expect(verifyCampaignPreviewToken(token, "sri-temple", "renovation-fund")).toBe(false);
    expect(verifyCampaignPreviewToken(token, "other-temple", "annadanam-fund")).toBe(false);
  });

  it("refuses a missing, malformed, or tampered token", () => {
    const token = createCampaignPreviewToken("sri-temple", "annadanam-fund");
    const [payload] = token.split(".");

    expect(verifyCampaignPreviewToken(null, "sri-temple", "annadanam-fund")).toBe(false);
    expect(verifyCampaignPreviewToken("", "sri-temple", "annadanam-fund")).toBe(false);
    expect(verifyCampaignPreviewToken("not-a-token", "sri-temple", "annadanam-fund")).toBe(false);
    expect(verifyCampaignPreviewToken(`${payload}.wrong-signature`, "sri-temple", "annadanam-fund")).toBe(false);
  });

  it("expires within the hour, so a pasted preview URL stops working", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-08-07T10:00:00.000Z"));
    const token = createCampaignPreviewToken("sri-temple", "annadanam-fund");

    vi.advanceTimersByTime((CAMPAIGN_PREVIEW_TOKEN_MAX_AGE_SECONDS - 60) * 1000);
    expect(verifyCampaignPreviewToken(token, "sri-temple", "annadanam-fund")).toBe(true);

    vi.advanceTimersByTime(120 * 1000);
    expect(verifyCampaignPreviewToken(token, "sri-temple", "annadanam-fund")).toBe(false);
  });
});
