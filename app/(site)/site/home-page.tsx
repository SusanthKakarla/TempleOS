import Link from "next/link";
import { requireSite } from "@/lib/site/get-site";
import { listSiteEvents, listSiteGallery, listSiteSevas } from "@/lib/site/site-data";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { siteSection } from "@/lib/site/temple-content";
import { SiteHero } from "@/features/site/site-hero";
import {
  EventCard,
  GalleryPreviewGrid,
  ProseBlock,
  SectionHeading,
  SevaCard,
  TimingsList,
} from "@/features/site/site-sections";

/**
 * The temple home page.
 *
 * Every section below is conditional on the temple actually having that
 * content — the page shortens rather than showing empty cards, which is the
 * rule the whole site follows.
 */
export async function TempleHomePage() {
  const { tenant, content } = await requireSite();
  const theme = SITE_THEMES[content.hero.theme];

  const [sevas, events, gallery] = await Promise.all([
    listSiteSevas(tenant.id),
    listSiteEvents(tenant.id, { upcomingOnly: true, limit: 3 }),
    listSiteGallery(tenant.id, 4),
  ]);

  const intro = content.story ?? content.about;

  return (
    <>
      <SiteHero content={content} />

      {intro && (
        <section className="mx-auto max-w-3xl px-5 py-14 md:px-8">
          <SectionHeading title={`Welcome to ${content.name}`} accent={theme.accent} />
          <ProseBlock text={intro} className="mt-5" />
          <Link
            href="/about"
            className="mt-6 inline-block text-sm font-semibold underline-offset-4 hover:underline"
            style={{ color: theme.accent }}
          >
            Read the temple&apos;s story
          </Link>
        </section>
      )}

      {siteSection.timings(content) && (
        <section className="mx-auto max-w-4xl px-5 py-14 md:px-8">
          <SectionHeading title="Darshan timings" accent={theme.accent} />
          <div className="mt-5">
            <TimingsList content={content} />
          </div>
          <Link
            href="/timings"
            className="mt-6 inline-block text-sm font-semibold underline-offset-4 hover:underline"
            style={{ color: theme.accent }}
          >
            Full timings
          </Link>
        </section>
      )}

      {sevas.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
          <SectionHeading title="Sevas" accent={theme.accent} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sevas.slice(0, 3).map((seva) => (
              <SevaCard key={seva.id} seva={seva} content={content} />
            ))}
          </div>
          {sevas.length > 3 && (
            <Link
              href="/sevas"
              className="mt-6 inline-block text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: theme.accent }}
            >
              All {sevas.length} sevas
            </Link>
          )}
        </section>
      )}

      {events.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
          <SectionHeading title="Upcoming events" accent={theme.accent} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} content={content} />
            ))}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
          <SectionHeading title="From the temple" accent={theme.accent} />
          <div className="mt-6">
            <GalleryPreviewGrid images={gallery} />
          </div>
          <Link
            href="/gallery"
            className="mt-6 inline-block text-sm font-semibold underline-offset-4 hover:underline"
            style={{ color: theme.accent }}
          >
            View the gallery
          </Link>
        </section>
      )}

      {siteSection.contact(content) && (
        <section className="mx-auto max-w-4xl px-5 py-14 md:px-8">
          <SectionHeading title="Visit the temple" accent={theme.accent} />
          <div className="mt-5 space-y-1 text-sm" style={{ color: theme.inkMuted }}>
            {content.address && <p>{content.address}</p>}
            {content.phone && <p>{content.phone}</p>}
          </div>
          <Link
            href="/contact"
            className="mt-6 inline-block text-sm font-semibold underline-offset-4 hover:underline"
            style={{ color: theme.accent }}
          >
            Contact and directions
          </Link>
        </section>
      )}
    </>
  );
}
