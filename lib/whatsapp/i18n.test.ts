import { afterEach, describe, expect, it, vi } from "vitest";
import { t } from "./i18n";
import { en } from "./locales/en";
import { te } from "./locales/te";

describe("t", () => {
  it("looks up a plain key in both languages", () => {
    expect(t("en", "menuButtonLabel")).toBe(en.menuButtonLabel);
    expect(t("te", "menuButtonLabel")).toBe(te.menuButtonLabel);
  });

  it("interpolates a single token", () => {
    expect(t("en", "eventsHeader", { temple: "Sri Venkateswara Temple" })).toBe(
      "Upcoming events at Sri Venkateswara Temple:",
    );
  });

  it("interpolates multiple tokens", () => {
    const result = t("en", "notifyNewEventIntro", {
      temple: "My Temple",
      title: "Ganesh Chaturthi",
      date: "5 Sep 2026",
      time: "10:00 AM",
    });
    expect(result).toBe(
      "🙏 Namaste. My Temple has announced a new event: *Ganesh Chaturthi*, on 5 Sep 2026 at 10:00 AM.",
    );
  });

  it("leaves an unmatched token placeholder untouched", () => {
    expect(t("en", "eventsHeader", {})).toBe("Upcoming events at {temple}:");
  });

  it("returns the value unchanged when no params are given, even if it has tokens", () => {
    expect(t("en", "eventsHeader")).toBe("Upcoming events at {temple}:");
  });

  describe("missing-key fallback", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("falls back to English and logs when the Telugu dictionary is missing a key at runtime", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const corruptedTe = te as unknown as Record<string, string>;
      const original = corruptedTe.menuButtonLabel;
      delete corruptedTe.menuButtonLabel;

      try {
        expect(t("te", "menuButtonLabel")).toBe(en.menuButtonLabel);
        expect(errorSpy).toHaveBeenCalledOnce();
      } finally {
        corruptedTe.menuButtonLabel = original;
      }
    });
  });
});
