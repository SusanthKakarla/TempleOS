import type { Metadata } from "next";
import { Playfair_Display, Noto_Sans } from "next/font/google";
import { getSiteForRequest, siteUrl } from "@/lib/site/get-site";
import { listSiteAnnouncements, listSiteSocialLinks } from "@/lib/site/site-data";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { SiteAnnouncementTicker, SiteFooter, SiteHeader } from "@/features/site/site-chrome";
import { TempleStructuredData } from "@/features/site/structured-data";
import { SiteUnavailable } from "@/features/site/site-unavailable";

const heading = Playfair_Display({ subsets: ["latin"], variable: "--font-site-heading", display: "swap" });
const body = Noto_Sans({ subsets: ["latin"], variable: "--font-site-sans", display: "swap" });

/**
 * Every public temple page renders inside this layout, and this is the single
 * place the request's hostname is turned into a temple. A page below can only
 * ever be reached once a live website resolved here, so no page has to repeat
 * the guard — or risk forgetting it.
 */
export async function generateMetadata(): Promise<Metadata> {
  const lookup = await getSiteForRequest();
  if (lookup.status !== "ok") return { title: "Temple website", robots: { index: false, follow: false } };

  const { content, hostname } = lookup.site;
  const canonical = siteUrl(hostname);

  return {
    metadataBase: new URL(canonical),
    title: { default: content.seo.title, template: `%s · ${content.name}` },
    description: content.seo.description ?? undefined,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: content.name,
      title: content.seo.title,
      description: content.seo.description ?? undefined,
      url: canonical,
      images: content.seo.ogImageUrl ? [content.seo.ogImageUrl] : undefined,
    },
    twitter: {
      card: content.seo.ogImageUrl ? "summary_large_image" : "summary",
      title: content.seo.title,
      description: content.seo.description ?? undefined,
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const lookup = await getSiteForRequest();

  // Not a temple website hostname at all — an unknown subdomain, an inactive
  // tenant, or the admin/product domain. Deliberately one message for all of
  // them: which it was is not a visitor's business.
  if (lookup.status === "not_found") {
    return (
      <SiteShell fonts={`${heading.variable} ${body.variable}`}>
        <SiteUnavailable
          title="Temple website not found"
          message="This address doesn't belong to a temple website. Please check the link you followed."
        />
      </SiteShell>
    );
  }

  if (lookup.status === "disabled") {
    return (
      <SiteShell fonts={`${heading.variable} ${body.variable}`}>
        <SiteUnavailable
          title="This temple website is currently unavailable"
          message={`${lookup.templeName} hasn't published its website yet. Please check back soon.`}
        />
      </SiteShell>
    );
  }

  const { content, tenant, hostname } = lookup.site;
  const [socialLinks, announcements] = await Promise.all([
    listSiteSocialLinks(tenant.id),
    listSiteAnnouncements(tenant.id),
  ]);
  const theme = SITE_THEMES[content.hero.theme];

  return (
    <SiteShell fonts={`${heading.variable} ${body.variable}`} background={theme.surface} ink={theme.ink}>
      <TempleStructuredData content={content} url={siteUrl(hostname)} />
      <SiteAnnouncementTicker announcements={announcements} content={content} />
      <SiteHeader content={content} />
      <main id="main">{children}</main>
      <SiteFooter content={content} socialLinks={socialLinks} />
    </SiteShell>
  );
}

/**
 * The public site sets its own typography and surface rather than inheriting
 * the admin portal's theme — a devotee should never see dashboard chrome, and
 * the admin portal is untouched by anything here.
 */
function SiteShell({
  fonts,
  background = "#FFF8E7",
  ink = "#2F211B",
  children,
}: {
  fonts: string;
  background?: string;
  ink?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fonts} min-h-screen [--font-heading:var(--font-site-heading)] [--font-sans:var(--font-site-sans)]`}
      style={{ backgroundColor: background, color: ink }}
    >
      {children}
    </div>
  );
}
