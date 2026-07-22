import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/db/tenant-features";
import type { FeatureKey } from "@/types/db";

/**
 * Call right after requireDashboardAdmin() in a dashboard page component.
 * Renders the standard not-found page if the tenant's feature is disabled —
 * indistinguishable from the route not existing, which is the point: a
 * disabled module shouldn't hint at what it would have shown.
 */
export async function requireTenantFeature(tenantId: string, featureKey: FeatureKey): Promise<void> {
  const enabled = await isFeatureEnabled(tenantId, featureKey);
  if (!enabled) notFound();
}

/**
 * Call right after requireTenantAdminSession() in an API route. Returns a
 * ready-to-return 403 NextResponse when the feature is disabled, or null
 * when the caller should proceed — `if (blocked) return blocked;`.
 */
export async function requireTenantFeatureApi(
  tenantId: string,
  featureKey: FeatureKey,
): Promise<NextResponse | null> {
  const enabled = await isFeatureEnabled(tenantId, featureKey);
  if (enabled) return null;
  return NextResponse.json({ error: "This feature is not enabled for your temple.", code: "FEATURE_DISABLED" }, { status: 403 });
}
