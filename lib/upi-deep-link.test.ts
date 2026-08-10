import { describe, expect, it } from "vitest";
import { buildUpiAppLinks, detectUpiPlatform, detectUpiPlatformFromBrowser, UPI_APPS } from "./upi-deep-link";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const UPI_URI = "upi://pay?pa=temple%40ybl&pn=Sri%20Temple&am=501.00&cu=INR&tn=Annadanam";

describe("detectUpiPlatform", () => {
  it.each([
    ["iPhone Safari", IPHONE_SAFARI],
    ["iPhone Chrome", IPHONE_CHROME],
  ])("reports ios for %s, where a generic upi:// link is answered by WhatsApp", (_label, ua) => {
    expect(detectUpiPlatform(ua)).toBe("ios");
  });

  it("reports android, where the OS provides its own chooser", () => {
    expect(detectUpiPlatform(ANDROID_CHROME)).toBe("android");
  });

  it("reports none for desktop, macOS, and an unknown agent", () => {
    expect(detectUpiPlatform(MAC_SAFARI)).toBe("none");
    expect(detectUpiPlatform(WINDOWS_CHROME)).toBe("none");
    expect(detectUpiPlatform(undefined)).toBe("none");
  });
});

describe("detectUpiPlatformFromBrowser", () => {
  it("treats a touch device reporting the Mac desktop UA as an iPad", () => {
    expect(detectUpiPlatformFromBrowser({ userAgent: MAC_SAFARI, maxTouchPoints: 5 })).toBe("ios");
  });

  it("leaves a real Mac on the QR path", () => {
    expect(detectUpiPlatformFromBrowser({ userAgent: MAC_SAFARI, maxTouchPoints: 0 })).toBe("none");
  });

  it("still recognises iPhone and Android directly", () => {
    expect(detectUpiPlatformFromBrowser({ userAgent: IPHONE_SAFARI, maxTouchPoints: 5 })).toBe("ios");
    expect(detectUpiPlatformFromBrowser({ userAgent: ANDROID_CHROME, maxTouchPoints: 5 })).toBe("android");
  });
});

describe("buildUpiAppLinks", () => {
  it("hands every app the identical, already-encoded payment query", () => {
    const links = buildUpiAppLinks(UPI_URI);
    const query = "?pa=temple%40ybl&pn=Sri%20Temple&am=501.00&cu=INR&tn=Annadanam";

    expect(links).toEqual([
      { name: "PhonePe", href: `phonepe://pay${query}` },
      { name: "Google Pay", href: `tez://upi/pay${query}` },
      { name: "Paytm", href: `paytmmp://pay${query}` },
      { name: "BHIM", href: `bhim://upi/pay${query}` },
    ]);
  });

  it("never emits a whatsapp target — the app that hijacks generic upi:// on iOS", () => {
    for (const { href } of buildUpiAppLinks(UPI_URI)) {
      expect(href).not.toMatch(/whatsapp/i);
    }
    expect(UPI_APPS.some((app) => /whatsapp/i.test(app.scheme))).toBe(false);
  });

  it("preserves the amount and payee exactly, so no app is handed different details", () => {
    for (const { href } of buildUpiAppLinks(UPI_URI)) {
      const params = new URLSearchParams(href.slice(href.indexOf("?")));
      expect(params.get("pa")).toBe("temple@ybl");
      expect(params.get("am")).toBe("501.00");
      expect(params.get("pn")).toBe("Sri Temple");
      expect(params.get("cu")).toBe("INR");
    }
  });

  it("returns nothing for a link that isn't a upi: payment link", () => {
    expect(buildUpiAppLinks("https://example.com/pay?am=1")).toEqual([]);
    expect(buildUpiAppLinks("upi://pay")).toEqual([]);
    expect(buildUpiAppLinks("")).toEqual([]);
  });
});
