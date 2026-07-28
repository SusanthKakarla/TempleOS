import { createSignedSessionToken, verifySignedSessionToken } from "@/lib/auth/session-token";

const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

export interface OAuthStatePayload {
  tenantId: string;
  membershipId: string;
  exp: number;
}

/**
 * Razorpay's Partner OAuth flow is a plain single-redirect OAuth 2 dance
 * (authorize -> our callback with ?code&state) — unlike the WhatsApp
 * Embedded Signup flow (lib/whatsapp/onboarding-handoff.ts), which needs a
 * two-phase handoff/result token pair because Meta's JS SDK redirects
 * through a fixed popup origin first. One signed `state` value is enough
 * here, reusing the same generic signing primitive the session cookie and
 * the WhatsApp handoff both already use — not a new signing mechanism.
 */
export function createOAuthState(input: { tenantId: string; membershipId: string }): string {
  return createSignedSessionToken(input, OAUTH_STATE_MAX_AGE_SECONDS);
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  return verifySignedSessionToken(state, isOAuthStatePayload);
}

function isOAuthStatePayload(payload: unknown): payload is OAuthStatePayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "tenantId" in payload &&
    "membershipId" in payload &&
    "exp" in payload &&
    typeof payload.tenantId === "string" &&
    typeof payload.membershipId === "string" &&
    typeof payload.exp === "number"
  );
}
