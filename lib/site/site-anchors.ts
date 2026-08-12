/**
 * The one-page temple site's section anchors.
 *
 * The public site is a single scrolling page, so "navigation" is an anchor
 * into this page rather than a route. This module is the single source of
 * those ids: the header nav, the footer, the hero CTAs, the scroll-spy and
 * the page that renders the sections all read it, so a section can never be
 * linked to by an id nothing renders (or rendered under an id nothing links).
 *
 * The equivalent standalone routes (/about, /timings, …) still exist and are
 * still in the sitemap — they are the crawlable, linkable fallback — but they
 * are not what the main navigation uses.
 */
export const SITE_SECTIONS = {
  home: "home",
  about: "about",
  timings: "timings",
  sevas: "sevas",
  events: "events",
  gallery: "gallery",
  donations: "donations",
  contact: "contact",
} as const;

export type SiteSectionId = (typeof SITE_SECTIONS)[keyof typeof SITE_SECTIONS];

export interface SiteNavItem {
  id: SiteSectionId;
  /** Key under the `site.nav` message namespace — the label itself is never stored here, so nothing is untranslatable by construction. */
  labelKey: SiteSectionId;
  /** The standalone route this section mirrors — used as the link's href so it degrades to a real page without JS. */
  fallbackHref: string;
}

/**
 * The header/footer navigation, in scroll order.
 *
 * Donations is deliberately absent: it appears only when the temple actually
 * has a live campaign, and a nav item that sometimes scrolls nowhere is worse
 * than no nav item. The hero and the section itself link to it instead.
 */
export const SITE_NAV_ITEMS: SiteNavItem[] = [
  { id: SITE_SECTIONS.home, labelKey: SITE_SECTIONS.home, fallbackHref: "/" },
  { id: SITE_SECTIONS.about, labelKey: SITE_SECTIONS.about, fallbackHref: "/about" },
  { id: SITE_SECTIONS.timings, labelKey: SITE_SECTIONS.timings, fallbackHref: "/timings" },
  { id: SITE_SECTIONS.sevas, labelKey: SITE_SECTIONS.sevas, fallbackHref: "/sevas" },
  { id: SITE_SECTIONS.events, labelKey: SITE_SECTIONS.events, fallbackHref: "/events" },
  { id: SITE_SECTIONS.gallery, labelKey: SITE_SECTIONS.gallery, fallbackHref: "/gallery" },
  { id: SITE_SECTIONS.contact, labelKey: SITE_SECTIONS.contact, fallbackHref: "/contact" },
];

/**
 * Where the Admin Login button goes: the tenant admin portal's existing login
 * route, on this same hostname. No new authentication surface — this is a link
 * to the page temple staff already use.
 */
export const ADMIN_LOGIN_HREF = "/login";
