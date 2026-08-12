import type { TempleSiteContent } from "@/lib/site/temple-content";
import { templeTimingWindows } from "./site-sections";

/**
 * schema.org describing THIS temple. Every value comes from the resolved
 * tenant, and any field the temple hasn't supplied is omitted rather than
 * guessed — structured data asserting an address nobody confirmed would be
 * worse than none at all.
 */
export function TempleStructuredData({ content, url }: { content: TempleSiteContent; url: string }) {
  const timings = templeTimingWindows(content);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HinduTemple",
    name: content.name,
    url,
  };

  if (content.seo.description) data.description = content.seo.description;
  if (content.seo.ogImageUrl) data.image = content.seo.ogImageUrl;
  if (content.address) data.address = { "@type": "PostalAddress", streetAddress: content.address };
  if (content.phone) data.telephone = content.phone;
  if (content.email) data.email = content.email;
  if (content.googleMapsUrl) data.hasMap = content.googleMapsUrl;
  if (timings.length > 0) data.openingHours = timings.map((window) => `Mo-Su ${window.opens}-${window.closes}`);

  return (
    <script
      type="application/ld+json"
      // Serialised server-side from our own values. `<` is escaped so a temple
      // name containing markup can never break out of the script element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
