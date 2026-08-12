import type { MetadataRoute } from "next";
import { getSiteForRequest, siteUrl } from "@/lib/site/get-site";
import { listSiteEvents } from "@/lib/site/site-data";

/**
 * Per-temple sitemap, served on the temple's own hostname.
 *
 * Every URL is built from the resolved hostname, so a temple's sitemap can
 * only ever list its own pages. A hostname that isn't a live website gets an
 * empty sitemap rather than the platform's.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lookup = await getSiteForRequest();
  if (lookup.status !== "ok") return [];

  const { hostname, tenant } = lookup.site;
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: siteUrl(hostname), lastModified: now, priority: 1 },
    ...["/about", "/timings", "/sevas", "/events", "/gallery", "/contact"].map((path) => ({
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
