/**
 * Scaffold mirroring `razorpay-oauth-client.ts`'s exact export shape, so that
 * a real implementation (once PhonePe grants Partner API access) is a
 * drop-in file replacement — no other file needs to change its imports or
 * call sites. PhonePe has no public `/authorize`+`/token` Partner OAuth
 * endpoints today (verified live against developer.phonepe.com and PhonePe's
 * own merchant-aggregator signup form in earlier sessions — merchant
 * onboarding there is a manual KYC business process, not a redirect-based
 * exchange), so every function below either reports "not configured" or
 * throws — never a fabricated URL/token.
 */

export interface PhonePeOAuthTokens {
  accessToken: string;
  refreshToken: string;
  merchantAccountId: string;
  expiresInSeconds: number;
}

const NOT_AVAILABLE_MESSAGE = "PhonePe Partner Onboarding is not yet available";

/** Always false today — PHONEPE_PLATFORM_CLIENT_ID/SECRET are documented but intentionally never set until PhonePe grants real Partner access. */
export function isPartnerOnboardingConfigured(): boolean {
  return Boolean(process.env.PHONEPE_PLATFORM_CLIENT_ID && process.env.PHONEPE_PLATFORM_CLIENT_SECRET);
}

export function buildAuthorizeUrl(_state: string, _redirectUri: string): string {
  throw new Error(NOT_AVAILABLE_MESSAGE);
}

export function exchangeAuthorizationCode(_code: string, _redirectUri: string): Promise<PhonePeOAuthTokens> {
  throw new Error(NOT_AVAILABLE_MESSAGE);
}

export function refreshAccessToken(_refreshToken: string): Promise<PhonePeOAuthTokens> {
  throw new Error(NOT_AVAILABLE_MESSAGE);
}
