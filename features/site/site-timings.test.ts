import { describe, expect, it } from "vitest";
import { templeTimingWindows } from "./site-sections";
import type { TempleSiteContent } from "@/lib/site/temple-content";

function content(overrides: Partial<TempleSiteContent["timings"]> = {}, timezone = "Asia/Kolkata"): TempleSiteContent {
  return {
    tenantId: "tenant-1",
    name: "Sri Uma Temple",
    deityName: null,
    shortDescription: null,
    about: null,
    story: null,
    history: null,
    address: null,
    googleMapsUrl: null,
    phone: null,
    email: null,
    timezone,
    hero: {
      template: "classic",
      theme: "saffron",
      title: "Sri Uma Temple",
      subtitle: null,
      deityImageUrl: null,
      backdropImageUrl: null,
      logoUrl: null,
    },
    timings: {
      morningOpen: "06:00:00",
      morningClose: "12:00:00",
      eveningOpen: "16:00:00",
      eveningClose: "21:00:00",
      ...overrides,
    },
    seo: { title: "Sri Uma Temple", description: null, ogImageUrl: null },
    languages: ["en"],
  };
}

/** 09:00 IST on 12 Aug 2026 — inside the morning window, outside the evening one. */
const MORNING_IST = new Date("2026-08-12T03:30:00.000Z");

describe("templeTimingWindows", () => {
  it("formats each configured window for display", () => {
    const windows = templeTimingWindows(content(), MORNING_IST);

    expect(windows).toHaveLength(2);
    expect(windows[0]).toMatchObject({ key: "morning", opens: "6:00 AM", closes: "12:00 PM" });
    expect(windows[1]).toMatchObject({ key: "evening", opens: "4:00 PM", closes: "9:00 PM" });
  });

  it("omits a window the temple hasn't fully configured rather than showing half of it", () => {
    const windows = templeTimingWindows(content({ eveningOpen: "16:00:00", eveningClose: null }), MORNING_IST);
    expect(windows.map((window) => window.key)).toEqual(["morning"]);
  });

  /*
   * The whole point of resolving "now" through the temple's timezone: the
   * server runs in UTC, where 03:30 is the middle of the night. Reading the
   * clock in UTC would tell devotees in Vijayawada their temple is shut at
   * 9am — the exact hour it is busiest.
   */
  it("decides open/closed in the temple's own timezone, not the server's", () => {
    const windows = templeTimingWindows(content(), MORNING_IST);

    expect(windows[0]).toMatchObject({ key: "morning", openNow: true });
    expect(windows[1]).toMatchObject({ key: "evening", openNow: false });
  });

  it("treats the closing minute as closed, so a window never reads open past its end", () => {
    // 12:00 IST exactly — the morning window's closing time.
    const windows = templeTimingWindows(content(), new Date("2026-08-12T06:30:00.000Z"));
    expect(windows[0].openNow).toBe(false);
  });

  it("follows a different tenant's timezone independently", () => {
    // The same instant is 23:30 in Auckland — both windows shut.
    const windows = templeTimingWindows(content({}, "Pacific/Auckland"), MORNING_IST);
    expect(windows.map((window) => window.openNow)).toEqual([false, false]);
  });

  it("still renders the timings when the timezone is unusable, just without a status", () => {
    const windows = templeTimingWindows(content({}, "Not/AZone"), MORNING_IST);

    expect(windows).toHaveLength(2);
    expect(windows[0].opens).toBe("6:00 AM");
    expect(windows[0].openNow).toBeNull();
  });
});
