import { createSignedSessionToken, verifySignedSessionToken } from "@/lib/auth/session-token";

/**
 * Short-lived, HMAC-signed proof that a temple admin asked to preview one
 * specific campaign's public page.
 *
 * Why this exists at all, when the dashboard session cookie already proves
 * who the admin is: the donation page is served from the shared public
 * donation host (DONATION_LINK_BASE_URL, e.g. demo.trytempleos.com) while
 * the admin's session cookie is host-only on their own temple subdomain, so
 * it is simply not sent when they click through to their campaign link.
 * Cookie-based preview keeps working wherever the two are same-origin (local
 * dev, or a deployment that serves donations from the tenant subdomain) —
 * this token covers the cross-host case without weakening the cookie's scope.
 *
 * Bound to the exact tenant+campaign slug pair so a leaked token can't be
 * replayed against a different campaign, and expiring within the hour so a
 * preview URL pasted into a group chat stops working almost immediately.
 * It grants *visibility only* — checkout re-validates against the public
 * rules regardless (see loadDonationCheckoutContext).
 */
export const CAMPAIGN_PREVIEW_TOKEN_MAX_AGE_SECONDS = 60 * 60;

/** Query-string parameter carrying the token on the public donation URL. */
export const CAMPAIGN_PREVIEW_PARAM = "preview";

interface CampaignPreviewTokenPayload {
  tenantSlug: string;
  campaignSlug: string;
  exp: number;
}

export function createCampaignPreviewToken(tenantSlug: string, campaignSlug: string): string {
  return createSignedSessionToken({ tenantSlug, campaignSlug }, CAMPAIGN_PREVIEW_TOKEN_MAX_AGE_SECONDS);
}

/** True only for an unexpired, correctly-signed token issued for this exact tenant+campaign. */
export function verifyCampaignPreviewToken(
  token: string | null | undefined,
  tenantSlug: string,
  campaignSlug: string,
): boolean {
  if (!token) return false;
  const payload = verifySignedSessionToken(token, isCampaignPreviewTokenPayload);
  if (!payload) return false;
  return payload.tenantSlug === tenantSlug && payload.campaignSlug === campaignSlug;
}

function isCampaignPreviewTokenPayload(payload: unknown): payload is CampaignPreviewTokenPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "tenantSlug" in payload &&
    "campaignSlug" in payload &&
    "exp" in payload &&
    typeof payload.tenantSlug === "string" &&
    typeof payload.campaignSlug === "string" &&
    typeof payload.exp === "number"
  );
}
