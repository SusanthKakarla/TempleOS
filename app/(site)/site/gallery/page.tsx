import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireSite } from "@/lib/site/get-site";
import { listSiteGallery } from "@/lib/site/site-data";
import { EmptyNotice, PageHeader } from "@/features/site/site-sections";
import { SiteGallery } from "@/features/site/site-gallery";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.gallery");
  return { title: t("title") };
}

export default async function GalleryPage() {
  const { tenant, content } = await requireSite();
  const t = await getTranslations("site.gallery");
  const images = await listSiteGallery(tenant.id);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle", { name: content.name })} content={content} />

      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        {images.length === 0 ? (
          <EmptyNotice message={t("empty")} content={content} />
        ) : (
          <SiteGallery images={images} />
        )}
      </div>
    </>
  );
}
