import { describe, expect, it } from "vitest";
import { buildTempleSiteContent, siteSection, type TempleSiteMedia } from "./temple-content";
import type { Tenant, TenantWebsite } from "@/types/db";

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: "tenant-1",
    slug: "sivatemple",
    name: "Sri Uma Ramalingeswara Swamy Temple",
    status: "active",
    defaultContactPhone: null,
    address: null,
    timezone: "Asia/Kolkata",
    welcomeMessage: null,
    description: null,
    history: null,
    contactEmail: null,
    googleMapsLink: null,
    morningOpen: null,
    morningClose: null,
    eveningOpen: null,
    eveningClose: null,
    donationInfo: null,
    notifyOnNewEvent: false,
    notifyOnEventUpdated: false,
    notifyOnEventCancelled: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeWebsite(overrides: Partial<TenantWebsite> = {}): TenantWebsite {
  return {
    id: "web-1",
    tenantId: "tenant-1",
    enabled: true,
    heroTemplate: "classic",
    theme: "saffron",
    displayName: null,
    deityName: null,
    heroTitle: null,
    heroSubtitle: null,
    story: null,
    aboutContent: null,
    seoTitle: null,
    seoDescription: null,
    deityMediaId: null,
    heroMediaId: null,
    logoMediaId: null,
    ogMediaId: null,
    languages: ["en"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const noMedia: TempleSiteMedia = { deityImageUrl: null, heroImageUrl: null, logoUrl: null, ogImageUrl: null };

describe("buildTempleSiteContent", () => {
  it("never invents content — a temple with nothing filled in yields empty sections, not placeholders", () => {
    const content = buildTempleSiteContent(makeTenant(), makeWebsite(), noMedia);

    expect(content.about).toBeNull();
    expect(content.story).toBeNull();
    expect(content.address).toBeNull();
    expect(content.phone).toBeNull();
    expect(content.hero.deityImageUrl).toBeNull();

    expect(siteSection.about(content)).toBe(false);
    expect(siteSection.timings(content)).toBe(false);
    expect(siteSection.contact(content)).toBe(false);
    expect(siteSection.deityFrame(content)).toBe(false);
  });

  it("always has a hero heading, falling back to the temple's own name — the h1 can never be blank", () => {
    expect(buildTempleSiteContent(makeTenant(), makeWebsite(), noMedia).hero.title).toBe(
      "Sri Uma Ramalingeswara Swamy Temple",
    );
    expect(
      buildTempleSiteContent(makeTenant(), makeWebsite({ heroTitle: "Vinayaka Chavithi 2026" }), noMedia).hero.title,
    ).toBe("Vinayaka Chavithi 2026");
  });

  it("prefers website copy over the operational chatbot fields, and falls back to them when unset", () => {
    const tenant = makeTenant({ description: "Chatbot description", history: "Built in 1801." });

    const withoutOverride = buildTempleSiteContent(tenant, makeWebsite(), noMedia);
    expect(withoutOverride.about).toBe("Chatbot description");
    expect(withoutOverride.history).toBe("Built in 1801.");

    const withOverride = buildTempleSiteContent(tenant, makeWebsite({ aboutContent: "Website about" }), noMedia);
    expect(withOverride.about).toBe("Website about");
  });

  it("treats whitespace-only admin input as empty, so a stray space can't publish a blank section", () => {
    const content = buildTempleSiteContent(
      makeTenant({ address: "   ", description: "\n\t " }),
      makeWebsite({ story: "  " }),
      noMedia,
    );
    expect(content.address).toBeNull();
    expect(content.about).toBeNull();
    expect(content.story).toBeNull();
  });

  it("uses the website's display name when set, so the public site can differ from the registered name", () => {
    const content = buildTempleSiteContent(makeTenant(), makeWebsite({ displayName: "Sri Uma Temple" }), noMedia);
    expect(content.name).toBe("Sri Uma Temple");
    expect(content.seo.title).toBe("Sri Uma Temple");
  });

  it("falls the hero backdrop back to the deity image, and the OG image through hero then deity", () => {
    const content = buildTempleSiteContent(makeTenant(), makeWebsite(), {
      ...noMedia,
      deityImageUrl: "https://ik.imagekit.io/x/deity.jpg",
    });

    expect(content.hero.backdropImageUrl).toBe("https://ik.imagekit.io/x/deity.jpg");
    expect(content.seo.ogImageUrl).toBe("https://ik.imagekit.io/x/deity.jpg");
    expect(siteSection.deityFrame(content)).toBe(true);
  });

  it("carries the temple's own timings and marks the section present when any are set", () => {
    const content = buildTempleSiteContent(
      makeTenant({ morningOpen: "06:00:00", morningClose: "12:00:00" }),
      makeWebsite(),
      noMedia,
    );
    expect(content.timings.morningOpen).toBe("06:00:00");
    expect(siteSection.timings(content)).toBe(true);
  });

  it("never yields an empty language list", () => {
    expect(buildTempleSiteContent(makeTenant(), makeWebsite({ languages: [] }), noMedia).languages).toEqual(["en"]);
    expect(buildTempleSiteContent(makeTenant(), makeWebsite({ languages: ["te"] }), noMedia).languages).toEqual(["te"]);
  });

  it("keeps each temple's content its own — two tenants share nothing", () => {
    const a = buildTempleSiteContent(
      makeTenant({ id: "a", name: "Temple A", address: "Street A" }),
      makeWebsite({ story: "Story A" }),
      { ...noMedia, deityImageUrl: "a.jpg" },
    );
    const b = buildTempleSiteContent(makeTenant({ id: "b", name: "Temple B" }), makeWebsite(), noMedia);

    expect(b.name).toBe("Temple B");
    expect(b.address).toBeNull();
    expect(b.story).toBeNull();
    expect(b.hero.deityImageUrl).toBeNull();
    expect(a.story).toBe("Story A");
  });
});
