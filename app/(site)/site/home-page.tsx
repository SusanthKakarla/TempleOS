import Link from "next/link";
import { MapPin, Phone, Mail, Navigation } from "lucide-react";
import { requireSite } from "@/lib/site/get-site";
import {
  listSiteCampaigns,
  listSiteEvents,
  listSiteGallery,
  listSiteSevas,
  listSiteSocialLinks,
} from "@/lib/site/site-data";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { SITE_SECTIONS } from "@/lib/site/site-anchors";
import { siteSection } from "@/lib/site/temple-content";
import { SiteHero } from "@/features/site/site-hero";
import { SiteCampaigns } from "@/features/site/site-campaigns";
import { SiteGallery } from "@/features/site/site-gallery";
import { EventCard, ProseBlock, SevaCard, SiteSection, TimingsList } from "@/features/site/site-sections";

/**
 * The temple's home page - and, for a devotee, the whole website.
 *
 * Everything worth knowing about the temple lives on this one scrolling page:
 * a visitor arriving from a WhatsApp link should be able to answer "who is
 * this temple, when can I visit, what is happening, how do I reach them"
 * without a second page load on a phone connection. The standalone routes
 * (/about, /timings, and the rest) still exist for search engines and deep
 * links, but the navigation scrolls within this page rather than leaving it.
 *
 * Every section below is conditional on the temple actually having that
 * content - the page shortens rather than showing empty cards, which is the
 * rule the whole site follows. Sections are ordered as a story: the entrance,
 * then who the temple is, then when to come, what is offered, what is
 * happening, what it looks like, how to help, and finally how to get there.
 */
export async function TempleHomePage() {
  const { tenant, content } = await requireSite();
  const theme = SITE_THEMES[content.hero.theme];

  const [sevas, events, gallery, campaigns, socialLinks] = await Promise.all([
    listSiteSevas(tenant.id),
    listSiteEvents(tenant.id, { upcomingOnly: true, limit: 6 }),
    listSiteGallery(tenant.id, 9),
    listSiteCampaigns(tenant.id, tenant.timezone),
    listSiteSocialLinks(tenant.id),
  ]);

  const story = content.story ?? content.about;
  const hasContact = siteSection.contact(content) || socialLinks.length > 0;

  return (
    <>
      <SiteHero content={content} />

      {siteSection.about(content) && (
        <SiteSection
          id={SITE_SECTIONS.about}
          eyebrow="Our sanctum"
          title="About the temple"
          content={content}
          width="narrow"
        >
          <div style={{ color: theme.inkMuted }}>
            {story && <ProseBlock text={story} />}
            {content.history && content.history !== story && (
              <div className="mt-10">
                <h3 className="font-heading text-xl" style={{ color: theme.ink }}>
                  Temple history
                </h3>
                <ProseBlock text={content.history} className="mt-3" />
              </div>
            )}
          </div>

          <p className="mt-10 text-center">
            <Link
              href="/about"
              className="text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              style={{ color: theme.accent }}
            >
              Read the full story
            </Link>
          </p>
        </SiteSection>
      )}

      {siteSection.timings(content) && (
        <SiteSection
          id={SITE_SECTIONS.timings}
          eyebrow="Plan your visit"
          title="Darshan &amp; pooja timings"
          content={content}
          tone="raised"
          width="narrow"
        >
          <TimingsList content={content} />
          <p className="mt-6 text-center text-xs" style={{ color: theme.inkMuted }}>
            Timings shown in the temple&apos;s local time. Festival days may differ, so please check the announcements
            above.
          </p>
        </SiteSection>
      )}

      {sevas.length > 0 && (
        <SiteSection id={SITE_SECTIONS.sevas} eyebrow="Offerings" title="Sevas &amp; poojas" content={content}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sevas.slice(0, 6).map((seva) => (
              <SevaCard key={seva.id} seva={seva} content={content} />
            ))}
          </div>
          {sevas.length > 6 && (
            <p className="mt-8 text-center">
              <Link
                href="/sevas"
                className="text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                style={{ color: theme.accent }}
              >
                All {sevas.length} sevas
              </Link>
            </p>
          )}
        </SiteSection>
      )}

      {events.length > 0 && (
        <SiteSection
          id={SITE_SECTIONS.events}
          eyebrow="What&apos;s happening"
          title="Temple events &amp; updates"
          content={content}
          tone="raised"
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} content={content} />
            ))}
          </div>
        </SiteSection>
      )}

      {gallery.length > 0 && (
        <SiteSection id={SITE_SECTIONS.gallery} eyebrow="Darshan" title="Temple moments" content={content}>
          <SiteGallery images={gallery} feature />
          <p className="mt-8 text-center">
            <Link
              href="/gallery"
              className="text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              style={{ color: theme.accent }}
            >
              View the full gallery
            </Link>
          </p>
        </SiteSection>
      )}

      {campaigns.length > 0 && (
        <SiteSection
          id={SITE_SECTIONS.donations}
          eyebrow="Seva to the temple"
          title="Support the temple"
          content={content}
          tone="raised"
        >
          <SiteCampaigns campaigns={campaigns} content={content} />
        </SiteSection>
      )}

      {hasContact && (
        <SiteSection
          id={SITE_SECTIONS.contact}
          eyebrow="Come and see us"
          title="Visit the temple"
          content={content}
          width="narrow"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {content.address && (
              <ContactCard
                icon={<MapPin className="size-4" />}
                label="Address"
                accent={theme.accent}
                ink={theme.ink}
                muted={theme.inkMuted}
                emphasis
              >
                <span className="whitespace-pre-line">{content.address}</span>
              </ContactCard>
            )}
            {content.phone && (
              <ContactCard
                icon={<Phone className="size-4" />}
                label="Phone"
                accent={theme.accent}
                ink={theme.ink}
                muted={theme.inkMuted}
              >
                <a href={`tel:${content.phone}`} className="hover:underline">
                  {content.phone}
                </a>
              </ContactCard>
            )}
            {content.email && (
              <ContactCard
                icon={<Mail className="size-4" />}
                label="Email"
                accent={theme.accent}
                ink={theme.ink}
                muted={theme.inkMuted}
              >
                <a href={`mailto:${content.email}`} className="break-all hover:underline">
                  {content.email}
                </a>
              </ContactCard>
            )}
            {socialLinks.length > 0 && (
              <ContactCard label="Follow the temple" accent={theme.accent} ink={theme.ink} muted={theme.inkMuted}>
                <span className="flex flex-wrap gap-2">
                  {socialLinks.map((link) => (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-black/10 px-3 py-1 text-xs capitalize hover:bg-black/5"
                    >
                      {link.platform}
                    </a>
                  ))}
                </span>
              </ContactCard>
            )}
          </div>

          {content.googleMapsUrl && (
            <p className="mt-8 text-center">
              <a
                href={content.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none motion-reduce:hover:translate-y-0"
                style={{ backgroundColor: theme.accent }}
              >
                <Navigation className="size-4" aria-hidden="true" />
                Get directions
              </a>
            </p>
          )}
        </SiteSection>
      )}
    </>
  );
}

function ContactCard({
  icon,
  label,
  accent,
  ink,
  muted,
  emphasis = false,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  accent: string;
  ink: string;
  muted: string;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="site-lift rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] uppercase" style={{ color: accent }}>
        {icon}
        {label}
      </p>
      <div className="mt-2.5 text-sm leading-relaxed" style={{ color: emphasis ? ink : muted }}>
        {children}
      </div>
    </div>
  );
}
