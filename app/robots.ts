import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSiteForRequest, siteUrl } from "@/lib/site/get-site";
import { isWebsiteHostname, resolveRequestHostname } from "@/lib/site/website-host";

/**
 * Everything on a temple's hostname that is not one of its public pages.
 *
 * The admin portal shares the hostname, so its paths are excluded here to keep
 * a temple's search results clean — they are all authenticated anyway, and a
 * bot gets a redirect rather than content, so this is not access control.
 *
 * `/site` is the internal prefix the middleware rewrites public pages to. It
 * is reachable directly and renders the same content, so it is excluded to
 * stop a crawler indexing every page twice under two addresses.
 */
const NON_PUBLIC_PATHS = ["/login", "/dashboard", "/api/", "/donate/", "/super-admin", "/access-denied", "/site"];

/**
 * Per-temple robots.txt, served on the temple's own hostname.
 *
 * Must live at the app root: Next only generates a robots route from this
 * file at the top of the app directory, so a copy nested under the (site)
 * tree produces no route at all and every `/robots.txt` request 404s.
 *
 * A live website invites indexing of its public pages, excludes the admin
 * portal it shares the hostname with, and points at its own sitemap. A temple
 * whose site is switched off is disallowed outright — an unpublished temple
 * should not appear in search results before it has said it is ready.
 *
 * The platform's own marketing host is not a temple website either, but must
 * not be de-indexed for that reason, so it is separated out by hostname first
 * and keeps the permissive posture it has always had.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const lookup = await getSiteForRequest();

  if (lookup.status === "ok") {
    const { hostname } = lookup.site;
    return {
      rules: { userAgent: "*", allow: "/", disallow: NON_PUBLIC_PATHS },
      sitemap: siteUrl(hostname, "/sitemap.xml"),
      host: hostname,
    };
  }

  const onTenantHost = isWebsiteHostname(resolveRequestHostname(await headers()));
  return onTenantHost
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/" } };
}
