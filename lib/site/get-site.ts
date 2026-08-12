import { headers } from "next/headers";
import { cache } from "react";
import { resolveWebsiteByHostname } from "@/lib/db/tenant-websites";
import { resolveSiteMediaUrls } from "./site-data";
import { buildTempleSiteContent, type TempleSiteContent } from "./temple-content";
import { resolveRequestHostname } from "./website-host";
import type { Tenant, TenantWebsite } from "@/types/db";

export interface SiteRequestContext {
  hostname: string;
  tenant: Tenant;
  website: TenantWebsite;
  content: TempleSiteContent;
}

export type SiteLookup =
  | { status: "ok"; site: SiteRequestContext }
  /** Hostname isn't a temple website at all (wrong domain, unknown subdomain, inactive tenant). */
  | { status: "not_found" }
  /** A real temple, but its website hasn't been switched on yet. */
  | { status: "disabled"; templeName: string };

/**
 * Resolves the temple for the current request, from the hostname alone.
 *
 * `cache()` deduplicates this within a single render pass, so a layout, a
 * page and its generateMetadata each calling it costs one database round
 * trip. The cache is per-request by construction — React's cache is scoped to
 * the render — so one temple's data can never be served to another's request,
 * which is the failure mode a naive module-level cache would introduce.
 */
export const getSiteForRequest = cache(async (): Promise<SiteLookup> => {
  const hostname = resolveRequestHostname(await headers());
  if (!hostname) return { status: "not_found" };

  const resolved = await resolveWebsiteByHostname(hostname);
  if (!resolved) return { status: "not_found" };

  const { tenant, website } = resolved;
  if (!website.enabled) return { status: "disabled", templeName: tenant.name };

  const media = await resolveSiteMediaUrls(tenant.id, {
    deity: website.deityMediaId,
    hero: website.heroMediaId,
    logo: website.logoMediaId,
    og: website.ogMediaId,
  });

  return {
    status: "ok",
    site: { hostname, tenant, website, content: buildTempleSiteContent(tenant, website, media) },
  };
});

/**
 * For pages that only render when a live website resolved — the layout has
 * already turned `not_found`/`disabled` into a rendered response, so by the
 * time a child page runs, this is guaranteed. Throwing here would mean the
 * layout guard was bypassed, which is a bug rather than a visitor state.
 */
export async function requireSite(): Promise<SiteRequestContext> {
  const lookup = await getSiteForRequest();
  if (lookup.status !== "ok") {
    throw new Error("requireSite() called outside a resolved temple website request");
  }
  return lookup.site;
}

/** Absolute URL on this temple's own hostname — used for canonical links, OG URLs and sitemaps. */
export function siteUrl(hostname: string, path = "/"): string {
  return `https://${hostname}${path.startsWith("/") ? path : `/${path}`}`;
}
