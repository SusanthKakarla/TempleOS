import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireSite } from "@/lib/site/get-site";
import { listSiteAnnouncements } from "@/lib/site/site-data";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { siteSection } from "@/lib/site/temple-content";
import { formatDate } from "@/lib/date";
import { EmptyNotice, PageHeader, SectionHeading, siteLanguage, TimingsList } from "@/features/site/site-sections";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.timings");
  return { title: t("title") };
}

export default async function TimingsPage() {
  const { tenant, content } = await requireSite();
  const theme = SITE_THEMES[content.hero.theme];
  const t = await getTranslations("site");
  const language = await siteLanguage();
  const specialDays = await listSiteAnnouncements(tenant.id);

  return (
    <>
      <PageHeader
        title={t("timings.title")}
        subtitle={t("timings.allTimesIn", { timezone: content.timezone.replace("_", " ") })}
        content={content}
      />

      <div className="mx-auto max-w-4xl space-y-12 px-5 py-14 md:px-8">
        {siteSection.timings(content) ? (
          <section>
            <SectionHeading title={t("timings.daily")} accent={theme.accent} />
            <div className="mt-5">
              <TimingsList content={content} />
            </div>
          </section>
        ) : (
          <EmptyNotice message={t("timings.empty")} content={content} />
        )}

        {specialDays.length > 0 && (
          <section>
            <SectionHeading title={t("timings.specialDays")} accent={theme.accent} />
            <ul className="mt-5 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-white">
              {specialDays.map((day) => (
                <li key={`${day.date}-${day.occasion}`} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
                  <span className="font-medium" style={{ color: theme.ink }}>
                    {day.occasion}
                  </span>
                  <span className="text-sm" style={{ color: theme.inkMuted }}>
                    {formatDate(day.date, language)}
                    {day.isClosed && ` · ${t("announcements.closed")}`}
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
