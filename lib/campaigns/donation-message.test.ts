import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildDonationCampaignVars,
  buildDonationLink,
  computeRaisedPercentage,
  isDonationCampaignReady,
} from "./donation-message";
import type { Campaign, Tenant } from "@/types/db";

const baseCampaign: Pick<
  Campaign,
  | "id"
  | "title"
  | "description"
  | "customMessage"
  | "goalAmount"
  | "campaignStartDate"
  | "campaignEndDate"
  | "donationLinkOverride"
  | "linkedDonationPurpose"
  | "slug"
  | "donationToken"
> = {
  id: "campaign-1",
  title: "Temple Roof Restoration",
  description: "Help us restore the ancient roof.",
  customMessage: null,
  goalAmount: "100000",
  campaignStartDate: "2026-01-01",
  campaignEndDate: "2026-01-31",
  donationLinkOverride: null,
  linkedDonationPurpose: "roof_restoration",
  slug: "temple-roof-restoration-abcd1234",
  donationToken: "test-token-123",
};

const tenant: Pick<Tenant, "name" | "slug"> = { name: "Sri Venkateswara Temple", slug: "sri-venkateswara" };

describe("isDonationCampaignReady", () => {
  it("is true when goal, both dates, and a linked purpose are all set", () => {
    expect(isDonationCampaignReady(baseCampaign)).toBe(true);
  });

  it("is false when goalAmount is missing", () => {
    expect(isDonationCampaignReady({ ...baseCampaign, goalAmount: null })).toBe(false);
  });

  it("is false when goalAmount is zero or negative", () => {
    expect(isDonationCampaignReady({ ...baseCampaign, goalAmount: "0" })).toBe(false);
  });

  it("is false when either date is missing — never falls back to an empty template variable", () => {
    expect(isDonationCampaignReady({ ...baseCampaign, campaignStartDate: null })).toBe(false);
    expect(isDonationCampaignReady({ ...baseCampaign, campaignEndDate: null })).toBe(false);
  });

  it("is false when there's no linked donation purpose to aggregate against", () => {
    expect(isDonationCampaignReady({ ...baseCampaign, linkedDonationPurpose: null })).toBe(false);
  });
});

describe("computeRaisedPercentage", () => {
  it("computes a plain ratio", () => {
    expect(computeRaisedPercentage(25000, 100000)).toBe(25);
  });

  it("is uncapped — can exceed 100 when the goal is surpassed", () => {
    expect(computeRaisedPercentage(150000, 100000)).toBe(150);
  });

  it("returns 0 for a zero or missing goal rather than dividing by zero", () => {
    expect(computeRaisedPercentage(5000, 0)).toBe(0);
  });
});

describe("buildDonationLink", () => {
  const ORIGINAL_ENV = process.env.DONATION_LINK_BASE_URL;

  afterEach(() => {
    process.env.DONATION_LINK_BASE_URL = ORIGINAL_ENV;
  });

  const campaign = { donationLinkOverride: null, slug: "temple-roof-restoration-abcd1234", donationToken: "test-token-123" };

  it("prefers the campaign's own override when set", () => {
    expect(buildDonationLink(tenant, { ...campaign, donationLinkOverride: "https://pay.example.com/custom" })).toBe(
      "https://pay.example.com/custom",
    );
  });

  it("falls back to DONATION_LINK_BASE_URL + tenantSlug/campaignSlug/token when no override is set", () => {
    process.env.DONATION_LINK_BASE_URL = "https://gateway.example.com/donate/";
    expect(buildDonationLink(tenant, campaign)).toBe(
      "https://gateway.example.com/donate/sri-venkateswara/temple-roof-restoration-abcd1234/test-token-123",
    );
  });

  it("falls back to the demo URL when the env var is unset", () => {
    delete process.env.DONATION_LINK_BASE_URL;
    expect(buildDonationLink(tenant, campaign)).toBe(
      "https://demo.trytempleos.com/donate/sri-venkateswara/temple-roof-restoration-abcd1234/test-token-123",
    );
  });
});

describe("buildDonationCampaignVars", () => {
  beforeEach(() => {
    delete process.env.DONATION_LINK_BASE_URL;
  });

  it("computes every variable the template needs, capping the displayed percentage at 100", () => {
    const { vars, goalReached, rawPercentage } = buildDonationCampaignVars(
      tenant,
      baseCampaign,
      { totalAmount: 150000 },
      "en",
    );
    expect(rawPercentage).toBe(150);
    expect(vars.raisedPercentage).toBe("100");
    expect(goalReached).toBe(true);
    expect(vars.templeName).toBe("Sri Venkateswara Temple");
    expect(vars.campaignTitle).toBe("Temple Roof Restoration");
    expect(vars.donationLink).toBe("https://demo.trytempleos.com/donate/sri-venkateswara/temple-roof-restoration-abcd1234/test-token-123");
  });

  it("goalReached is false below the goal", () => {
    const { goalReached, vars } = buildDonationCampaignVars(tenant, baseCampaign, { totalAmount: 40000 }, "en");
    expect(goalReached).toBe(false);
    expect(vars.raisedPercentage).toBe("40");
  });

  it("never leaves campaignDescription or blessingMessage empty, even when the campaign has neither set", () => {
    const { vars } = buildDonationCampaignVars(
      tenant,
      { ...baseCampaign, description: null, customMessage: null },
      { totalAmount: 0 },
      "en",
    );
    expect(vars.campaignDescription.length).toBeGreaterThan(0);
    expect(vars.blessingMessage.length).toBeGreaterThan(0);
  });

  it("uses the campaign's customMessage as the blessing message when set", () => {
    const { vars } = buildDonationCampaignVars(
      tenant,
      { ...baseCampaign, customMessage: "May the deity bless every contributor." },
      { totalAmount: 0 },
      "en",
    );
    expect(vars.blessingMessage).toBe("May the deity bless every contributor.");
  });
});
