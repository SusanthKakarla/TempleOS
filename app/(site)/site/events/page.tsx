import type { Metadata } from "next";
import { requireSite } from "@/lib/site/get-site";
import { listSiteEvents } from "@/lib/site/site-data";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { EmptyNotice, EventCard, PageHeader, SectionHeading } from "@/features/site/site-sections";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const { tenant, content } = await requireSite();
  const theme = SITE_THEMES[content.hero.theme];
  const [upcoming, all] = await Promise.all([
    listSiteEvents(tenant.id, { upcomingOnly: true }),
    listSiteEvents(tenant.id),
  ]);
  const upcomingIds = new Set(upcoming.map((event) => event.id));
  const past = all.filter((event) => !upcomingIds.has(event.id)).reverse();

  return (
    <>
      <PageHeader title="Events" subtitle="Festivals and occasions at the temple." content={content} />

      <div className="mx-auto max-w-6xl space-y-14 px-5 py-14 md:px-8">
        {all.length === 0 && (
          <EmptyNotice message="This temple hasn't published any events yet." content={content} />
        )}

        {upcoming.length > 0 && (
          <section>
            <SectionHeading title="Upcoming" accent={theme.accent} />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} content={content} />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <SectionHeading title="Past events" accent={theme.accent} />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((event) => (
                <EventCard key={event.id} event={event} content={content} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
