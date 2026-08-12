import { describe, expect, it } from "vitest";
import { ADMIN_LOGIN_HREF, SITE_NAV_ITEMS, SITE_SECTIONS } from "./site-anchors";

describe("one-page navigation model", () => {
  it("only offers sections that exist", () => {
    const known = new Set<string>(Object.values(SITE_SECTIONS));
    for (const item of SITE_NAV_ITEMS) {
      expect(known.has(item.id)).toBe(true);
    }
  });

  it("has no duplicate anchors, which would make the scroll spy ambiguous", () => {
    const ids = SITE_NAV_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /*
   * Each nav item is a real link first and an anchor second — that is what
   * keeps the site usable without JavaScript, and what lets a section the
   * temple has no content for still lead somewhere rather than dying on a
   * hash that matches nothing.
   */
  it("gives every item a real route to fall back to", () => {
    for (const item of SITE_NAV_ITEMS) {
      expect(item.fallbackHref.startsWith("/")).toBe(true);
    }
  });

  it("covers the sections the page is built from, in scroll order", () => {
    expect(SITE_NAV_ITEMS.map((item) => item.id)).toEqual([
      "home",
      "about",
      "timings",
      "sevas",
      "events",
      "gallery",
      "contact",
    ]);
  });

  /*
   * Donations is a section but deliberately not a nav item: it renders only
   * when the temple has a live campaign, and a nav link that sometimes
   * scrolls nowhere is worse than no link.
   */
  it("keeps the conditional donations section out of the fixed navigation", () => {
    expect(SITE_SECTIONS.donations).toBe("donations");
    expect(SITE_NAV_ITEMS.some((item) => item.id === SITE_SECTIONS.donations)).toBe(false);
  });

  it("points Admin Login at the existing tenant login, not a new one", () => {
    expect(ADMIN_LOGIN_HREF).toBe("/login");
  });
});
