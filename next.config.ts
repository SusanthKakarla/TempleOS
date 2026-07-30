import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Enforcing headers — safe defaults with no functional risk to any existing
// flow (this app never needs to be framed, never sets a cross-origin
// referrer policy exception, and doesn't use geolocation/camera/mic/payment
// browser APIs).
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=(), payment=()" },
];

// Report-only for now, not enforced: this app loads Razorpay Checkout.js,
// the Firebase Auth SDK, and the WhatsApp Embedded Signup (Facebook JS) SDK
// on top of ImageKit-hosted images — getting a strict CSP wrong in enforcing
// mode risks silently breaking the donation checkout modal or login. This
// collects real violation data in the browser console with zero chance of
// blocking anything; flipping to enforcing is a follow-up once that data
// confirms the allowlist is complete.
const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  // https://www.google.com and https://www.recaptcha.net (Google's regional
  // fallback, used where google.com is blocked) are required for Firebase
  // Phone Auth's invisible RecaptchaVerifier — without them here, flipping
  // this policy to enforcing would break phone-OTP login with
  // auth/captcha-check-failed even though nothing else changed.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.gstatic.com https://apis.google.com https://connect.facebook.net https://www.google.com https://www.recaptcha.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://ik.imagekit.io https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://www.googleapis.com https://graph.facebook.com https://www.google.com https://www.recaptcha.net",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://accounts.google.com https://*.firebaseapp.com https://www.facebook.com https://business.facebook.com https://www.google.com https://www.recaptcha.net",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Content-Security-Policy-Report-Only", value: CONTENT_SECURITY_POLICY_REPORT_ONLY },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
