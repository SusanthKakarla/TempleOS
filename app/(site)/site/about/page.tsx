import type { Metadata } from "next";
import { requireSite } from "@/lib/site/get-site";
import { listSiteGallery } from "@/lib/site/site-data";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { siteSection } from "@/lib/site/temple-content";
import { EmptyNotice, GalleryPreviewGrid, PageHeader, ProseBlock, SectionHeading } from "@/features/site/site-sections";

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await requireSite();
  return { title: "About", description: content.about ?? content.seo.description ?? undefined };
}

export default async function AboutPage() {
  const { tenant, content } = await requireSite();
  const theme = SITE_THEMES[content.hero.theme];
  const images = await listSiteGallery(tenant.id, 4);

  return (
    <>
      <PageHeader title={`About ${content.name}`} subtitle={content.deityName} content={content} />

      <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
        {!siteSection.about(content) ? (
          <EmptyNotice message="This temple hasn't published its story yet." content={content} />
        ) : (
          <div className="space-y-12">
            {content.about && (
              <section>
                <SectionHeading title="About the temple" accent={theme.accent} />
                <ProseBlock text={content.about} className="mt-5" />
              </section>
            )}

            {content.story && content.story !== content.about && (
              <section>
                <SectionHeading title="Our story" accent={theme.accent} />
                <ProseBlock text={content.story} className="mt-5" />
              </section>
            )}

            {content.history && (
              <section>
                <SectionHeading title="History" accent={theme.accent} />
                <ProseBlock text={content.history} className="mt-5" />
              </section>
            )}

            {images.length > 0 && <GalleryPreviewGrid images={images} />}
          </div>
        )}
      </div>
    </>
  );
}
