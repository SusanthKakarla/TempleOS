import type { Metadata } from "next";
import { requireSite } from "@/lib/site/get-site";
import { listSiteSocialLinks } from "@/lib/site/site-data";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { siteSection } from "@/lib/site/temple-content";
import { EmptyNotice, PageHeader, SectionHeading } from "@/features/site/site-sections";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const { tenant, content } = await requireSite();
  const theme = SITE_THEMES[content.hero.theme];
  const socialLinks = await listSiteSocialLinks(tenant.id);

  const nothingToShow = !siteSection.contact(content) && socialLinks.length === 0;

  return (
    <>
      <PageHeader title="Contact" subtitle={`How to reach ${content.name}.`} content={content} />

      <div className="mx-auto max-w-3xl space-y-10 px-5 py-14 md:px-8">
        {nothingToShow ? (
          <EmptyNotice message="This temple hasn't published its contact details yet." content={content} />
        ) : (
          <>
            {siteSection.contact(content) && (
              <section className="space-y-4 rounded-2xl border border-black/5 bg-white p-6">
                {content.address && (
                  <div>
                    <p className="text-xs tracking-wide uppercase" style={{ color: theme.inkMuted }}>
                      Address
                    </p>
                    <p className="mt-1 whitespace-pre-line" style={{ color: theme.ink }}>
                      {content.address}
                    </p>
                  </div>
                )}
                {content.phone && (
                  <div>
                    <p className="text-xs tracking-wide uppercase" style={{ color: theme.inkMuted }}>
                      Phone
                    </p>
                    <a href={`tel:${content.phone}`} className="mt-1 block hover:underline" style={{ color: theme.ink }}>
                      {content.phone}
                    </a>
                  </div>
                )}
                {content.email && (
                  <div>
                    <p className="text-xs tracking-wide uppercase" style={{ color: theme.inkMuted }}>
                      Email
                    </p>
                    <a
                      href={`mailto:${content.email}`}
                      className="mt-1 block hover:underline"
                      style={{ color: theme.ink }}
                    >
                      {content.email}
                    </a>
                  </div>
                )}
                {content.googleMapsUrl && (
                  <a
                    href={content.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                    style={{ backgroundColor: theme.accent }}
                  >
                    Open in Google Maps
                  </a>
                )}
              </section>
            )}

            {socialLinks.length > 0 && (
              <section>
                <SectionHeading title="Follow the temple" accent={theme.accent} />
                <ul className="mt-5 flex flex-wrap gap-2">
                  {socialLinks.map((link) => (
                    <li key={link.platform}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-full border border-black/10 px-4 py-2 text-sm capitalize hover:bg-black/5"
                        style={{ color: theme.ink }}
                      >
                        {link.platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
