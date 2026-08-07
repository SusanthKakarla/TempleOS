import { getSessionAdmin } from "@/lib/auth/session";
import { getTenantBySlug } from "@/lib/db/tenants";
import { verifyCampaignPreviewToken } from "./campaign-preview-token";

/**
 * May the current request preview this campaign's public page as its temple's
 * admin? Two independent proofs, either of which is sufficient:
 *
 *  1. A live dashboard session belonging to THIS tenant (getSessionAdmin
 *     already re-checks the membership and that the tenant is active, so a
 *     removed or deactivated admin loses preview at the same moment they lose
 *     the dashboard). Works when the donation page and the dashboard share an
 *     origin.
 *  2. A short-lived signed preview token minted by that same dashboard for
 *     this exact tenant+campaign — see campaign-preview-token.ts for why the
 *     cookie alone isn't enough across the public donation host.
 *
 * Never grants anything on its own: the caller passes the verdict to
 * resolveDonationCheckoutAvailability, which still enforces every identity
 * check (real tenant, real campaign, correct donation token) and still
 * refuses to create orders.
 */
export async function canPreviewCampaignAsAdmin(
  tenantSlug: string,
  campaignSlug: string,
  previewToken: string | null | undefined,
): Promise<boolean> {
  if (verifyCampaignPreviewToken(previewToken, tenantSlug, campaignSlug)) return true;

  const session = await getSessionAdmin();
  if (!session) return false;

  const tenant = await getTenantBySlug(tenantSlug);
  return tenant !== null && tenant.id === session.tenantId;
}
