/**
 * Razorpay's Partner OAuth application endpoints (`auth.razorpay.com`) —
 * distinct from the regular Razorpay API the `razorpay` npm package wraps
 * (`api.razorpay.com`), so these are plain `fetch` calls rather than SDK
 * methods. Confirmed against Razorpay's current Partner Integration docs:
 * authorize -> `/token` (code exchange / refresh) -> Bearer-authenticated
 * API calls via `new Razorpay({ oauthToken })` (see razorpay-adapter.ts).
 */

const AUTHORIZE_URL = "https://auth.razorpay.com/authorize";
const TOKEN_URL = "https://auth.razorpay.com/token";

export interface RazorpayOAuthTokens {
  accessToken: string;
  refreshToken: string;
  publicToken: string | null;
  razorpayAccountId: string;
  expiresInSeconds: number;
}

export function isPartnerOnboardingConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_PARTNER_CLIENT_ID && process.env.RAZORPAY_PARTNER_CLIENT_SECRET);
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const clientId = process.env.RAZORPAY_PARTNER_CLIENT_ID;
  if (!clientId) {
    throw new Error("RAZORPAY_PARTNER_CLIENT_ID is not configured");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "read_write",
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  public_token?: string;
  razorpay_account_id: string;
  expires_in: number;
  token_type: string;
}

async function requestToken(body: Record<string, string>): Promise<RazorpayOAuthTokens> {
  const clientId = process.env.RAZORPAY_PARTNER_CLIENT_ID;
  const clientSecret = process.env.RAZORPAY_PARTNER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Razorpay Partner OAuth is not configured");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...body }).toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Razorpay OAuth token request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    publicToken: data.public_token ?? null,
    razorpayAccountId: data.razorpay_account_id,
    expiresInSeconds: data.expires_in,
  };
}

export function exchangeAuthorizationCode(code: string, redirectUri: string): Promise<RazorpayOAuthTokens> {
  return requestToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

/** The old refresh token auto-expires once used — always persist the new pair returned here. */
export function refreshAccessToken(refreshToken: string): Promise<RazorpayOAuthTokens> {
  return requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}
