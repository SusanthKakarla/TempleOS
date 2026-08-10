/**
 * How a given device can be handed a UPI payment link.
 *
 * - `android` — the OS resolves `upi://` through an intent chooser, so one
 *   generic link lets the devotee pick PhonePe / Google Pay / Paytm / BHIM /
 *   any other installed UPI app themselves.
 * - `ios` — no chooser exists. iOS hands a custom scheme to whichever app
 *   registered it, and **WhatsApp registers `upi://`** (WhatsApp Pay is a UPI
 *   app in India), so a generic link produces 'allow this website to open
 *   "WhatsApp"?' and never reaches a payment app. The chooser therefore has
 *   to be built in-page from each app's own scheme (see UPI_APPS).
 * - `none` — desktop, macOS, and anything unrecognised: no UPI app can claim
 *   the scheme at all, so the QR code and the copyable UPI ID are the path.
 */
export type UpiPlatform = "android" | "ios" | "none";

export function detectUpiPlatform(userAgent: string | undefined): UpiPlatform {
  if (!userAgent) return "none";
  if (/android/i.test(userAgent)) return "android";
  // iPadOS 13+ reports a desktop Mac UA and is indistinguishable from a real
  // Mac by UA alone; touch support separates them, but a Mac wrongly offered
  // app buttons simply sees links that do nothing, while an iPad wrongly
  // denied them loses its only tap-to-pay path. `maxTouchPoints` is checked
  // by the caller for exactly this.
  if (/iphone|ipod|ipad/i.test(userAgent)) return "ios";
  return "none";
}

/** Resolves the platform, using touch support to tell an iPad (desktop UA since iPadOS 13) from a Mac. */
export function detectUpiPlatformFromBrowser(navigatorLike: {
  userAgent: string;
  maxTouchPoints?: number;
  platform?: string;
}): UpiPlatform {
  const byUserAgent = detectUpiPlatform(navigatorLike.userAgent);
  if (byUserAgent !== "none") return byUserAgent;

  const looksLikeMac = /macintosh|mac os x/i.test(navigatorLike.userAgent) || /mac/i.test(navigatorLike.platform ?? "");
  if (looksLikeMac && (navigatorLike.maxTouchPoints ?? 0) > 1) return "ios";
  return "none";
}

export interface UpiApp {
  /** Shown on the button. */
  name: string;
  /** The app's own iOS URL scheme, including the path the UPI parameters hang off. */
  scheme: string;
}

/**
 * The UPI apps worth offering on iOS, with the scheme each one registers.
 * They all accept the same NPCI parameters (pa/pn/am/cu/tn) as `upi://pay`,
 * so only the scheme and path differ.
 *
 * These schemes are published by the apps but are not part of the NPCI spec,
 * so they can change without notice. That is survivable: a scheme that no
 * longer resolves (or an app that isn't installed) simply does nothing on
 * iOS, and the QR code and copyable UPI ID below the buttons still work.
 * Deliberately excludes a generic `upi://` entry — on iOS that is precisely
 * what WhatsApp answers.
 */
export const UPI_APPS: readonly UpiApp[] = [
  { name: "PhonePe", scheme: "phonepe://pay" },
  { name: "Google Pay", scheme: "tez://upi/pay" },
  { name: "Paytm", scheme: "paytmmp://pay" },
  { name: "BHIM", scheme: "bhim://upi/pay" },
];

/**
 * Rewrites a `upi://pay?…` link onto each app's own scheme, preserving the
 * query exactly as built server-side (payee, payee name, amount, currency,
 * note) so every app is handed identical, already-encoded payment details.
 * Returns an empty list for anything that isn't a upi: link.
 */
export function buildUpiAppLinks(upiUri: string): { name: string; href: string }[] {
  const queryStart = upiUri.indexOf("?");
  if (!upiUri.toLowerCase().startsWith("upi://") || queryStart === -1) return [];
  const query = upiUri.slice(queryStart);
  return UPI_APPS.map((app) => ({ name: app.name, href: `${app.scheme}${query}` }));
}
