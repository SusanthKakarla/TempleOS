import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireSite } from "@/lib/site/get-site";
import { getSiteEvent } from "@/lib/site/site-data";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { formatDateTime } from "@/lib/date";
import { PageHeader, ProseBlock, siteLanguage } from "@/features/site/site-sections";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant } = await requireSite();
  const { id } = await params;
  const event = await getSiteEvent(tenant.id, id);
  if (!event) {
    const t = await getTranslations("site.events");
    return { title: t("single") };
  }
  return {
    title: event.title,
    description: event.description?.slice(0, 160) ?? undefined,
    openGraph: { images: event.imageUrl ? [event.imageUrl] : undefined },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { tenant, content } = await requireSite();
  const { id } = await params;

  // Scoped to this tenant inside the query, so an event id belonging to
  // another temple is simply not found rather than rendered here.
  const event = await getSiteEvent(tenant.id, id);
  if (!event) notFound();

  const theme = SITE_THEMES[content.hero.theme];
  const t = await getTranslations("site.events");
  const language = await siteLanguage();

  return (
    <>
      <PageHeader title={event.title} subtitle={formatDateTime(event.startsAt, language)} content={content} />

      <article className="mx-auto max-w-3xl px-5 py-14 md:px-8">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL
          <img
            src={event.imageUrl}
            alt=""
            className="mb-8 aspect-video w-full rounded-2xl border border-black/5 object-cover"
          />
        )}

        <dl className="grid gap-3 rounded-2xl border border-black/5 bg-white p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs tracking-wide uppercase" style={{ color: theme.inkMuted }}>
              {t("begins")}
            </dt>
            <dd className="mt-1 font-medium" style={{ color: theme.ink }}>
              {formatDateTime(event.startsAt, language)}
            </dd>
          </div>
          {event.endsAt && (
            <div>
              <dt className="text-xs tracking-wide uppercase" style={{ color: theme.inkMuted }}>
                {t("ends")}
              </dt>
              <dd className="mt-1 font-medium" style={{ color: theme.ink }}>
                {formatDateTime(event.endsAt, language)}
              </dd>
            </div>
          )}
          {event.location && (
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide uppercase" style={{ color: theme.inkMuted }}>
                {t("location")}
              </dt>
              <dd className="mt-1 font-medium" style={{ color: theme.ink }}>
                {event.location}
              </dd>
            </div>
          )}
        </dl>

        {event.description && <ProseBlock text={event.description} className="mt-8" />}

        <Link
          href="/events"
          className="mt-10 inline-block text-sm font-semibold underline-offset-4 hover:underline"
          style={{ color: theme.accent }}
        >
          {t("backToEvents")}
        </Link>
      </article>
    </>
  );
}
