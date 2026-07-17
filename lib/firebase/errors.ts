/** Maps Firebase Auth error codes to user-friendly messages for the phone-OTP login flow. */
const FIREBASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-phone-number":
    "Enter a valid phone number in international format, e.g. +91XXXXXXXXXX.",
  "auth/missing-phone-number": "Enter your phone number.",
  "auth/quota-exceeded": "SMS quota exceeded for this project. Please try again later.",
  "auth/too-many-requests": "Too many attempts. Please wait a while before trying again.",
  "auth/captcha-check-failed": "reCAPTCHA verification failed. Please try again.",
  "auth/invalid-app-credential": "reCAPTCHA verification failed. Please try again.",
  "auth/invalid-verification-code": "That code doesn't look right. Please check and try again.",
  "auth/code-expired": "This code has expired. Request a new one.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/internal-error": "Something went wrong. Please try again.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/configuration-not-found": "Phone sign-in is not enabled for this app. Contact support.",
  "auth/billing-not-enabled": "SMS delivery is not enabled for this project. Contact support.",
  "auth/operation-not-allowed": "SMS delivery is not allowed for this region. Contact support.",
};

function isFirebaseAuthError(err: unknown): err is { code: string; message: string } {
  return typeof err === "object" && err !== null && "code" in err && typeof (err as { code: unknown }).code === "string";
}

export function getFirebaseErrorMessage(err: unknown, fallback: string): string {
  if (isFirebaseAuthError(err)) {
    const mapped = FIREBASE_AUTH_ERROR_MESSAGES[err.code];
    if (mapped) return mapped;
    devLog("Unmapped Firebase error code:", err.code, err.message);
  }
  return err instanceof Error ? err.message : fallback;
}

/** Development-only logging — no-ops in production builds. */
export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV !== "production") {
    console.log("[auth]", ...args);
  }
}
