import Link from "next/link";
import { SITE_THEMES } from "@/lib/site/site-theme";
import type { SiteAnnouncement, SiteSocialLink } from "@/lib/site/site-data";
import type { TempleSiteContent } from "@/lib/site/temple-content";
import { formatDate } from "@/lib/date";
import { SiteNav } from "./site-nav";

/**
 * Header, footer and announcement ticker for a temple's public site.
 *
 * Every branded value — name, logo, links, colours — comes from the resolved
 * tenant. Nothing here has a default that belongs to another temple, so a
 * misconfigured site renders plainly rather than wearing someone else's
 * identity.
 */

export interface SiteChromeProps {
  content: TempleSiteContent;
  socialLinks: SiteSocialLink[];
  announcements: SiteAnnouncement[];
}

export function SiteAnnouncementTicker({
  announcements,
  content,
}: {
  announcements: SiteAnnouncement[];
  content: TempleSiteContent;
}) {
  if (announcements.length === 0) return null;
  const theme = SITE_THEMES[content.hero.theme];

  return (
    <div className="overflow-hidden text-white" style={{ backgroundColor: theme.base }} role="status" aria-live="polite">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-2 text-xs md:px-8">
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
          style={{ backgroundColor: theme.accent }}
        >
          Upcoming
        </span>
        {/* A plain scrollable row rather than a marquee: text that slides past
            is hard to read and impossible to pause on a phone. */}
        <ul className="no-scrollbar flex min-w-0 gap-5 overflow-x-auto">
          {announcements.map((item) => (
            <li key={`${item.date}-${item.occasion}`} className="shrink-0 whitespace-nowrap text-white/90">
              <span className="font-medium">{item.occasion}</span>
              <span className="text-white/60"> · {formatDate(item.date, "en")}</span>
              {item.isClosed && <span className="text-white/60"> · Temple closed</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SiteHeader({ content }: { content: TempleSiteContent }) {
  const theme = SITE_THEMES[content.hero.theme];

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 focus-visible:ring-2 focus-visible:outline-none">
          {content.hero.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL
            <img src={content.hero.logoUrl} alt="" className="size-10 shrink-0 rounded-lg object-contain" />
          ) : (
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-white"
              style={{ backgroundColor: theme.accent }}
              aria-hidden="true"
            >
              {content.name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 truncate font-heading text-base font-semibold" style={{ color: theme.ink }}>
            {content.name}
          </span>
        </Link>

        <SiteNav accent={theme.accent} />
      </div>
    </header>
  );
}

export function SiteFooter({ content, socialLinks }: { content: TempleSiteContent; socialLinks: SiteSocialLink[] }) {
  const theme = SITE_THEMES[content.hero.theme];

  return (
    <footer className="mt-16 text-white" style={{ backgroundColor: theme.base }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3 md:px-8">
        <div>
          <p className="font-heading text-lg">{content.name}</p>
          {content.deityName && <p className="mt-1 text-sm text-white/70">{content.deityName}</p>}
        </div>

        {(content.address || content.phone || content.email) && (
          <div className="space-y-1 text-sm text-white/80">
            {content.address && <p>{content.address}</p>}
            {content.phone && (
              <p>
                <a className="hover:underline" href={`tel:${content.phone}`}>
                  {content.phone}
                </a>
              </p>
            )}
            {content.email && (
              <p>
                <a className="hover:underline" href={`mailto:${content.email}`}>
                  {content.email}
                </a>
              </p>
            )}
          </div>
        )}

        {socialLinks.length > 0 && (
          <div>
            <p className="text-xs font-medium tracking-wide text-white/60 uppercase">Follow the temple</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {socialLinks.map((link) => (
                <li key={link.platform}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/25 px-3 py-1.5 text-xs capitalize transition-colors hover:bg-white/10"
                  >
                    {link.platform}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">Powered by TempleOS</div>
    </footer>
  );
}
