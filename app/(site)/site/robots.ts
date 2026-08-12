import type { MetadataRoute } from "next";
import { getSiteForRequest, siteUrl } from "@/lib/site/get-site";

/**
 * Per-temple robots.txt.
 *
 * A live website invites indexing and points at its own sitemap. A hostname
 * that resolves to nothing, or to a temple that hasn't switched its site on,
 * is disallowed outright — an unpublished temple should not appear in search
 * results before it has said it is ready.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const lookup = await getSiteForRequest();

  if (lookup.status !== "ok") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  const { hostname } = lookup.site;
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: siteUrl(hostname, "/sitemap.xml"),
    host: hostname,
  };
}
