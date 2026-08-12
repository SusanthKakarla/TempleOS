import type { SupportedLanguage, Tenant, TenantWebsite } from "@/types/db";

/**
 * The shape every public-website component reads from.
 *
 * The reference site (Sri-Uma-Shankara-Vigneshwara-Swamy-Temple) keeps this
 * as a hand-edited `content/temple.ts` — one structured object, no database.
 * TempleOS assembles the identical shape per tenant from the tables the admin
 * portal already writes to, so the reference's components port across almost
 * unchanged while every temple gets its own content and nothing is
 * duplicated into a website-only copy.
 *
 * Two rules are carried over from the reference, because they are what keep a
 * temple site honest:
 *
 *  1. An empty field HIDES its section. The site never fills a gap with a
 *     placeholder — an invented address is worse than no address.
 *  2. Nothing is inherited from another temple. Every string here comes from
 *     this tenant's own rows or is absent.
 */
export interface TempleSiteContent {
  /** Tenant id — for server-side queries only; never rendered or sent to the browser as an identifier. */
  tenantId: string;
  /** Display name: the website's own override, else the tenant's registered name. */
  name: string;
  deityName: string | null;
  shortDescription: string | null;
  about: string | null;
  story: string | null;
  history: string | null;

  address: string | null;
  googleMapsUrl: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;

  hero: {
    template: TenantWebsite["heroTemplate"];
    theme: TenantWebsite["theme"];
    title: string;
    subtitle: string | null;
    /** Uploaded deity portrait — the focal point of the 3D frame. Null hides the frame rather than substituting stock art. */
    deityImageUrl: string | null;
    /** Backdrop behind the hero. Falls back to the deity image (blurred by the component), then to nothing. */
    backdropImageUrl: string | null;
    logoUrl: string | null;
  };

  timings: {
    morningOpen: string | null;
    morningClose: string | null;
    eveningOpen: string | null;
    eveningClose: string | null;
  };

  seo: {
    title: string;
    description: string | null;
    ogImageUrl: string | null;
  };

  languages: SupportedLanguage[];
}

export interface TempleSiteMedia {
  deityImageUrl: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  ogImageUrl: string | null;
}

/** Trims and collapses an admin-entered string to null when it holds nothing worth rendering. */
function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Assembles a temple's public content from its tenant row, its website
 * config, and the media URLs already resolved by the caller.
 *
 * Precedence is always: website-specific override → operational tenant data →
 * null (section hidden). That ordering is what lets a temple word its public
 * site differently from its WhatsApp chatbot copy without maintaining two
 * copies of the facts.
 */
export function buildTempleSiteContent(
  tenant: Tenant,
  website: TenantWebsite,
  media: TempleSiteMedia,
): TempleSiteContent {
  const name = present(website.displayName) ?? tenant.name;
  const shortDescription = present(website.heroSubtitle) ?? present(tenant.description);

  return {
    tenantId: tenant.id,
    name,
    deityName: present(website.deityName),
    shortDescription,
    // `story` is website copy; `description`/`history` are the chatbot CMS
    // fields the admin already maintains. About falls back through both so a
    // temple that filled in the chatbot gets a populated About page for free.
    about: present(website.aboutContent) ?? present(tenant.description),
    story: present(website.story),
    history: present(tenant.history),

    address: present(tenant.address),
    googleMapsUrl: present(tenant.googleMapsLink),
    phone: present(tenant.defaultContactPhone),
    email: present(tenant.contactEmail),
    timezone: tenant.timezone,

    hero: {
      template: website.heroTemplate,
      theme: website.theme,
      // The heading is the one field that must never be empty — it is the
      // page's h1 — so it falls back to the temple's own name.
      title: present(website.heroTitle) ?? name,
      subtitle: shortDescription,
      deityImageUrl: media.deityImageUrl,
      backdropImageUrl: media.heroImageUrl ?? media.deityImageUrl,
      logoUrl: media.logoUrl,
    },

    timings: {
      morningOpen: tenant.morningOpen,
      morningClose: tenant.morningClose,
      eveningOpen: tenant.eveningOpen,
      eveningClose: tenant.eveningClose,
    },

    seo: {
      title: present(website.seoTitle) ?? name,
      description: present(website.seoDescription) ?? shortDescription,
      ogImageUrl: media.ogImageUrl ?? media.heroImageUrl ?? media.deityImageUrl,
    },

    languages: website.languages.length > 0 ? website.languages : ["en"],
  };
}

/** True when the temple has published enough for a given section to be worth rendering at all. */
export const siteSection = {
  about: (content: TempleSiteContent) => Boolean(content.about || content.story || content.history),
  timings: (content: TempleSiteContent) =>
    Boolean(
      content.timings.morningOpen ||
        content.timings.morningClose ||
        content.timings.eveningOpen ||
        content.timings.eveningClose,
    ),
  contact: (content: TempleSiteContent) =>
    Boolean(content.address || content.phone || content.email || content.googleMapsUrl),
  deityFrame: (content: TempleSiteContent) => Boolean(content.hero.deityImageUrl),
};
