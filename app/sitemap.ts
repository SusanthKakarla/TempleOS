import type { MetadataRoute } from "next";
import { getSiteForRequest, siteUrl } from "@/lib/site/get-site";
import { listSiteEvents } from "@/lib/site/site-data";

/**
 * Per-temple sitemap, served on the temple's own hostname.
 *
 * Lives at the app root rather than under the (site) tree because a crawler
 * only ever fetches `/sitemap.xml` — and the middleware's matcher deliberately
 * skips paths with a file extension, so a nested route could never be reached
 * at that address. Resolution is by hostname exactly as every public page
 * does it, so a temple's sitemap can only ever list its own pages.
 *
 * A request on the admin/product domain resolves to nothing and gets an empty
 * sitemap — the admin portal has no public pages to advertise.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lookup = await getSiteForRequest();
  if (lookup.status !== "ok") return [];

  const { hostname, tenant } = lookup.site;
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: siteUrl(hostname), lastModified: now, priority: 1 },
    ...["/about", "/timings", "/sevas", "/events", "/gallery", "/slokas", "/contact"].map((path) => ({
      url: siteUrl(hostname, path),
      lastModified: now,
      priority: 0.7,
    })),
  ];

  const events = await listSiteEvents(tenant.id);
  for (const event of events) {
    pages.push({ url: siteUrl(hostname, `/events/${event.id}`), lastModified: now, priority: 0.5 });
  }

  return pages;
}
