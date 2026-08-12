import { ShieldCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { isSupportedLanguage } from "@/types/db";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { ADMIN_LOGIN_HREF, SITE_NAV_ITEMS, SITE_SECTIONS } from "@/lib/site/site-anchors";
import type { SiteAnnouncement, SiteSocialLink } from "@/lib/site/site-data";
import type { TempleSiteContent } from "@/lib/site/temple-content";
import { formatDate } from "@/lib/date";
import { SiteNav } from "./site-nav";
import { TempleLogo } from "./temple-logo";

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

/**
 * The temple's own upcoming special days, as a continuously scrolling ribbon.
 *
 * The list is rendered twice and the track translated by exactly -50%, which
 * is what makes the loop seamless: at the moment the first copy has fully left
 * the viewport the second sits precisely where the first began, so the reset
 * is invisible. The duplicate is `aria-hidden` so a screen reader hears each
 * announcement once.
 *
 * It pauses on hover and on keyboard focus, and the whole animation is
 * disabled under reduced motion — where it becomes a plain horizontally
 * scrollable row that the devotee moves themselves.
 */
export async function SiteAnnouncementTicker({
  announcements,
  content,
}: {
  announcements: SiteAnnouncement[];
  content: TempleSiteContent;
}) {
  if (announcements.length === 0) return null;
  const theme = SITE_THEMES[content.hero.theme];
  const t = await getTranslations("site.announcements");
  const locale = await getLocale();

  const items = announcements.map((item) => (
    <span key={`${item.date}-${item.occasion}`} className="flex shrink-0 items-center gap-2 px-5 whitespace-nowrap">
      <span className="size-1 rounded-full" style={{ backgroundColor: theme.accentSoft }} aria-hidden="true" />
      <span className="font-medium">{item.occasion}</span>
      <span className="text-white/55">{formatDate(item.date, isSupportedLanguage(locale) ? locale : "en")}</span>
      {item.isClosed && <span className="text-white/55">· {t("closed")}</span>}
    </span>
  ));

  return (
    <div
      className="site-marquee group relative overflow-hidden text-xs text-white/90"
      style={{ backgroundColor: theme.base }}
      role="region"
      aria-label={t("label")}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-black/25 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-black/25 to-transparent" aria-hidden="true" />

      <div className="site-marquee-track flex w-max items-center py-2.5">
        <div className="flex items-center">{items}</div>
        <div className="flex items-center" aria-hidden="true">
          {items}
        </div>
      </div>
    </div>
  );
}

/**
 * The header's branding is the temple's NAME, not its mark.
 *
 * The circular logo was removed from here deliberately: at header size it read
 * as a favicon next to the name it was already repeating, and it cost the row
 * width that the navigation, the language toggle and Admin Login all need.
 * The logo is untouched everywhere it carries weight — the hero, the footer,
 * and every other place it is used.
 */
export function SiteHeader({ content }: { content: TempleSiteContent }) {
  const theme = SITE_THEMES[content.hero.theme];

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/85 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-5 py-2.5 md:px-8">
        <a
          href={`#${SITE_SECTIONS.home}`}
          className="flex min-w-0 flex-col rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="min-w-0 truncate font-heading text-[0.95rem] leading-tight font-semibold" style={{ color: theme.ink }}>
            {content.name}
          </span>
          {content.deityName && (
            <span
              className="hidden truncate text-[0.62rem] tracking-[0.18em] uppercase sm:block"
              style={{ color: theme.inkMuted }}
            >
              {content.deityName}
            </span>
          )}
        </a>

        <SiteNav accent={theme.accent} ink={theme.ink} />
      </div>
    </header>
  );
}

export async function SiteFooter({
  content,
  socialLinks,
}: {
  content: TempleSiteContent;
  socialLinks: SiteSocialLink[];
}) {
  const theme = SITE_THEMES[content.hero.theme];
  const t = await getTranslations("site");

  return (
    <footer className="relative mt-24 overflow-hidden text-white" style={{ backgroundColor: theme.base }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${theme.accentSoft}, transparent)` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 size-[28rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: theme.accent, opacity: 0.16 }}
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <TempleLogo content={content} accent={theme.accent} size="md" />
          <p className="mt-4 font-heading text-xl">{content.name}</p>
          {content.deityName && (
            <p className="mt-1 text-xs tracking-[0.2em] uppercase" style={{ color: theme.accentSoft }}>
              {content.deityName}
            </p>
          )}
          {content.shortDescription && (
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{content.shortDescription}</p>
          )}
        </div>

        <nav aria-label={t("nav.label")}>
          <p className="text-xs font-medium tracking-wide text-white/50 uppercase">{t("footer.explore")}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {SITE_NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-white/75 transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                >
                  {t(`nav.${item.labelKey}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-xs font-medium tracking-wide text-white/50 uppercase">{t("footer.reach")}</p>
          <div className="mt-4 space-y-2.5 text-sm text-white/75">
            {content.address && <p className="whitespace-pre-line">{content.address}</p>}
            {content.phone && (
              <p>
                <a className="hover:text-white" href={`tel:${content.phone}`}>
                  {content.phone}
                </a>
              </p>
            )}
            {content.email && (
              <p>
                <a className="hover:text-white" href={`mailto:${content.email}`}>
                  {content.email}
                </a>
              </p>
            )}
          </div>

          {socialLinks.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {socialLinks.map((link) => (
                <li key={link.platform}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-full border border-white/20 px-3 py-1.5 text-xs capitalize transition-colors hover:bg-white/10"
                  >
                    {link.platform}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <a
            href={ADMIN_LOGIN_HREF}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs text-white/70 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none"
          >
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {t("nav.adminLogin")}
          </a>
        </div>
      </div>

      <div className="relative border-t border-white/10 py-4 text-center text-xs text-white/45">
        © {new Date().getFullYear()} {content.name} · {t("footer.poweredBy")}
      </div>
    </footer>
  );
}
