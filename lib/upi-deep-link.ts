/**
 * Whether this device can be handed a `upi://pay` link safely.
 *
 * Only Android can. Android resolves `upi://` through an intent chooser, so
 * the devotee picks PhonePe / Google Pay / Paytm / BHIM themselves.
 *
 * Apple platforms have no chooser: iOS and macOS hand a custom scheme to
 * whichever installed app registered it, and **WhatsApp registers `upi://`**
 * (WhatsApp Pay is itself a UPI app in India). So on an iPhone, iPad, or Mac
 * a `upi://pay` navigation produces 'Do you want to allow this website to
 * open "WhatsApp"?' — the payment never reaches the temple's UPI app, and the
 * devotee is left believing the donation page tried to open WhatsApp at them.
 * There is no capability test for "which app claims this scheme", so the
 * platform check is unavoidable here.
 *
 * Everything else (desktop browsers, unknown platforms) is treated as unable
 * too: the QR code and the copyable UPI ID work everywhere and cannot
 * mis-target an app.
 */
export function supportsUpiDeepLink(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  // iPadOS 13+ reports a desktop Mac UA, which the Apple branch already
  // covers — no separate iPad test is needed.
  if (/iphone|ipad|ipod|macintosh|mac os x/i.test(userAgent)) return false;
  return /android/i.test(userAgent);
}
