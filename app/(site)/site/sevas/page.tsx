import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireSite } from "@/lib/site/get-site";
import { listSiteSevas } from "@/lib/site/site-data";
import { EmptyNotice, PageHeader, SevaCard } from "@/features/site/site-sections";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.sevas");
  return { title: t("title") };
}

export default async function SevasPage() {
  const { tenant, content } = await requireSite();
  const t = await getTranslations("site.sevas");
  const sevas = await listSiteSevas(tenant.id);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle", { name: content.name })} content={content} />

      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        {sevas.length === 0 ? (
          <EmptyNotice message={t("empty")} content={content} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sevas.map((seva) => (
              <SevaCard key={seva.id} seva={seva} content={content} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
