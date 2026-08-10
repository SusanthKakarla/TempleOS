import { describe, expect, it } from "vitest";
import { supportsUpiDeepLink } from "./upi-deep-link";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const IPAD_DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

describe("supportsUpiDeepLink", () => {
  it.each([
    ["iPhone Safari", IPHONE_SAFARI],
    ["iPhone Chrome", IPHONE_CHROME],
    ["macOS Safari", MAC_SAFARI],
    ["iPadOS (desktop UA)", IPAD_DESKTOP_UA],
  ])(
    "refuses the upi:// deep link on %s — Apple platforms have no chooser and WhatsApp registers the upi scheme, so the link prompts to open WhatsApp instead of a UPI app",
    (_label, userAgent) => {
      expect(supportsUpiDeepLink(userAgent)).toBe(false);
    },
  );

  it.each([
    ["Android phone", ANDROID_CHROME],
    ["Android tablet", ANDROID_TABLET],
  ])("allows it on %s, where the OS shows a UPI app chooser", (_label, userAgent) => {
    expect(supportsUpiDeepLink(userAgent)).toBe(true);
  });

  it("refuses on desktop browsers and when the user agent is unknown", () => {
    expect(supportsUpiDeepLink(WINDOWS_CHROME)).toBe(false);
    expect(supportsUpiDeepLink(undefined)).toBe(false);
    expect(supportsUpiDeepLink("")).toBe(false);
  });
});
