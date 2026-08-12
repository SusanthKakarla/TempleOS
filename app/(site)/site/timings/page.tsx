import type { Metadata } from "next";
import { requireSite } from "@/lib/site/get-site";
import { listSiteAnnouncements } from "@/lib/site/site-data";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { siteSection } from "@/lib/site/temple-content";
import { formatDate } from "@/lib/date";
import { EmptyNotice, PageHeader, SectionHeading, TimingsList } from "@/features/site/site-sections";

export const metadata: Metadata = { title: "Timings" };

export default async function TimingsPage() {
  const { tenant, content } = await requireSite();
  const theme = SITE_THEMES[content.hero.theme];
  const specialDays = await listSiteAnnouncements(tenant.id);

  return (
    <>
      <PageHeader
        title="Darshan timings"
        subtitle={`All times are ${content.timezone.replace("_", " ")}.`}
        content={content}
      />

      <div className="mx-auto max-w-4xl space-y-12 px-5 py-14 md:px-8">
        {siteSection.timings(content) ? (
          <section>
            <SectionHeading title="Daily" accent={theme.accent} />
            <div className="mt-5">
              <TimingsList content={content} />
            </div>
          </section>
        ) : (
          <EmptyNotice message="This temple hasn't published its timings yet." content={content} />
        )}

        {specialDays.length > 0 && (
          <section>
            <SectionHeading title="Special days" accent={theme.accent} />
            <ul className="mt-5 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-white">
              {specialDays.map((day) => (
                <li key={`${day.date}-${day.occasion}`} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
                  <span className="font-medium" style={{ color: theme.ink }}>
                    {day.occasion}
                  </span>
                  <span className="text-sm" style={{ color: theme.inkMuted }}>
                    {formatDate(day.date, "en")}
                    {day.isClosed && " · Temple closed"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
