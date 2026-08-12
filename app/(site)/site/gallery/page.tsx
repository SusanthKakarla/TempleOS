import type { Metadata } from "next";
import { requireSite } from "@/lib/site/get-site";
import { listSiteGallery } from "@/lib/site/site-data";
import { EmptyNotice, PageHeader } from "@/features/site/site-sections";
import { SiteGallery } from "@/features/site/site-gallery";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage() {
  const { tenant, content } = await requireSite();
  const images = await listSiteGallery(tenant.id);

  return (
    <>
      <PageHeader title="Gallery" subtitle="Photographs from the temple." content={content} />

      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        {images.length === 0 ? (
          <EmptyNotice message="This temple hasn't published any photographs yet." content={content} />
        ) : (
          <SiteGallery images={images} />
        )}
      </div>
    </>
  );
}
