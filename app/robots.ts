import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSiteForRequest, siteUrl } from "@/lib/site/get-site";
import { isWebsiteHostname, resolveRequestHostname } from "@/lib/site/website-host";

/**
 * Per-temple robots.txt, served on the temple's own hostname.
 *
 * Must live at the app root: Next only generates a robots route from this
 * file at the top of the app directory, so a copy nested under the (site)
 * tree produces no route at all and every `/robots.txt` request 404s.
 *
 * A live website invites indexing and points at its own sitemap. A temple
 * whose site is switched off, or a website subdomain that resolves to
 * nothing, is disallowed outright — an unpublished temple should not appear
 * in search results before it has said it is ready.
 *
 * The admin/product domain is not a temple website either, but must not be
 * de-indexed for that reason, so it is separated out by hostname first and
 * keeps the permissive posture it has always had (serving no robots.txt at
 * all, as before this route existed, is equivalent to allowing everything).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const lookup = await getSiteForRequest();

  if (lookup.status === "ok") {
    const { hostname } = lookup.site;
    return {
      rules: { userAgent: "*", allow: "/" },
      sitemap: siteUrl(hostname, "/sitemap.xml"),
      host: hostname,
    };
  }

  const onWebsiteDomain = isWebsiteHostname(resolveRequestHostname(await headers()));
  return onWebsiteDomain
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/" } };
}
