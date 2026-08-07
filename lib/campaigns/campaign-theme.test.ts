import { describe, expect, it } from "vitest";
import { DONATION_PURPOSE_PRESETS } from "@/features/donations/donation-options";
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_THEMES,
  resolveCampaignCategory,
  resolveCampaignHeroImage,
  resolveCampaignTheme,
} from "./campaign-theme";

describe("resolveCampaignCategory", () => {
  it.each([
    ["Construction / Renovation", "renovation"],
    ["Temple Maintenance", "renovation"],
    ["Annadanam (Food Offering)", "annadanam"],
    ["Festival Sponsorship", "festival"],
    ["Archana", "seva"],
    ["Abhishekam", "seva"],
    ["Vastra / Alankaram", "seva"],
    ["Seva", "seva"],
    ["General Donation", "general"],
  ] as const)("maps the dashboard purpose preset %s to the %s theme", (purpose, expected) => {
    expect(resolveCampaignCategory(purpose)).toBe(expected);
  });

  it("maps the free text temples actually type, case- and separator-insensitively", () => {
    expect(resolveCampaignCategory("Renovation")).toBe("renovation");
    expect(resolveCampaignCategory("prasadam")).toBe("annadanam");
    expect(resolveCampaignCategory("GOPURAM_REPAIR")).toBe("renovation");
    expect(resolveCampaignCategory("go-seva")).toBe("goseva");
    expect(resolveCampaignCategory("Veda Patashala")).toBe("education");
    expect(resolveCampaignCategory("Medical Camp")).toBe("medical");
    expect(resolveCampaignCategory("  Daily  Pooja  ")).toBe("seva");
  });

  it("falls back to the campaign title when the purpose is generic or missing", () => {
    expect(resolveCampaignCategory("General Donation", "Gopuram Renovation Fund")).toBe("renovation");
    expect(resolveCampaignCategory(null, "Annadanam Seva")).toBe("annadanam");
    expect(resolveCampaignCategory(undefined, null)).toBe("general");
    expect(resolveCampaignCategory("", "")).toBe("general");
  });

  it("prefers the more specific keyword when several could match", () => {
    // "cow shelter" must not be read as generic temple work, and "temple
    // maintenance" must not be read as the standalone word "temple".
    expect(resolveCampaignCategory("Cow Shelter")).toBe("goseva");
    expect(resolveCampaignCategory("Temple Maintenance")).toBe("renovation");
    // "Festival Annadanam" leads with food, which is what the money buys.
    expect(resolveCampaignCategory("Festival Annadanam")).toBe("annadanam");
  });

  it("never leaves a campaign themeless — every category resolves to a complete theme", () => {
    for (const category of CAMPAIGN_CATEGORIES) {
      const theme = CAMPAIGN_THEMES[category];
      expect(theme.category).toBe(category);
      expect(theme.label.length).toBeGreaterThan(0);
      expect(theme.heroImage).toMatch(/^\//);
      expect(theme.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.impactPoints.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives every purpose preset the dashboard offers a usable theme", () => {
    for (const preset of DONATION_PURPOSE_PRESETS) {
      expect(resolveCampaignTheme(preset).impactPoints.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("resolveCampaignHeroImage", () => {
  const theme = CAMPAIGN_THEMES.annadanam;

  it("prefers the temple's own uploaded banner", () => {
    expect(resolveCampaignHeroImage("https://ik.imagekit.io/x/banner.jpg", theme)).toBe(
      "https://ik.imagekit.io/x/banner.jpg",
    );
  });

  it("falls back to the category image so the hero is never empty", () => {
    expect(resolveCampaignHeroImage(null, theme)).toBe(theme.heroImage);
    expect(resolveCampaignHeroImage("   ", theme)).toBe(theme.heroImage);
  });
});
