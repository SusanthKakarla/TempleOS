import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import { isSupportedLanguage } from "@/types/db";
import type { Tenant, TenantWebsite, WebsiteHeroTemplate, WebsiteTheme } from "@/types/db";

interface TenantWebsiteRow {
  id: string;
  tenant_id: string;
  enabled: boolean;
  hero_template: WebsiteHeroTemplate;
  theme: WebsiteTheme;
  display_name: string | null;
  deity_name: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  story: string | null;
  about_content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  deity_media_id: string | null;
  hero_media_id: string | null;
  logo_media_id: string | null;
  og_media_id: string | null;
  languages: string[];
  created_at: Date;
  updated_at: Date;
}

function mapWebsite(row: TenantWebsiteRow): TenantWebsite {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    enabled: row.enabled,
    heroTemplate: row.hero_template,
    theme: row.theme,
    displayName: row.display_name,
    deityName: row.deity_name,
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    story: row.story,
    aboutContent: row.about_content,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    deityMediaId: row.deity_media_id,
    heroMediaId: row.hero_media_id,
    logoMediaId: row.logo_media_id,
    ogMediaId: row.og_media_id,
    languages: row.languages.filter(isSupportedLanguage),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const WEBSITE_COLUMNS = `id, tenant_id, enabled, hero_template, theme, display_name, deity_name,
  hero_title, hero_subtitle, story, about_content, seo_title, seo_description,
  deity_media_id, hero_media_id, logo_media_id, og_media_id, languages, created_at, updated_at`;

export interface ResolvedTenantWebsite {
  tenant: Tenant;
  website: TenantWebsite;
}

/**
 * The single entry point that turns an incoming hostname into a temple.
 *
 * Security-critical: the tenant is derived ONLY from the request hostname,
 * matched against a `website`-kind row in tenant_domains. A tenant id from a
 * query string, header, or cookie is never consulted, so a visitor cannot
 * address another temple's content by manipulating the URL.
 *
 * `kind = 'website'` is part of the match on purpose: a tenant's ADMIN
 * subdomain must never resolve to a public site, and vice versa, even though
 * both live in the same table.
 *
 * Returns null for an unknown host, an inactive domain, a suspended tenant,
 * or a temple with no website row at all — the caller renders "not found"
 * without disclosing which of those it was. A row that exists but is disabled
 * IS returned, so the caller can say "currently unavailable" instead.
 */
export async function resolveWebsiteByHostname(
  hostname: string,
  client: QueryClient = getPool(),
): Promise<ResolvedTenantWebsite | null> {
  const { rows } = await client.query<TenantWebsiteRow & Record<string, unknown>>(
    `SELECT ${WEBSITE_COLUMNS.split(",").map((c) => `w.${c.trim()}`).join(", ")},
            t.id AS t_id, t.slug AS t_slug, t.name AS t_name, t.status AS t_status,
            t.default_contact_phone, t.address, t.timezone, t.welcome_message, t.description,
            t.history, t.contact_email, t.google_maps_link, t.morning_open, t.morning_close,
            t.evening_open, t.evening_close, t.donation_info, t.notify_on_new_event,
            t.notify_on_event_updated, t.notify_on_event_cancelled,
            t.created_at AS t_created_at, t.updated_at AS t_updated_at
     FROM tenant_domains d
     JOIN tenants t ON t.id = d.tenant_id
     JOIN tenant_websites w ON w.tenant_id = t.id
     WHERE d.hostname = $1 AND d.kind = 'website' AND d.status = 'active' AND t.status = 'active'
     LIMIT 1`,
    [hostname.trim().toLowerCase()],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    website: mapWebsite(row),
    tenant: {
      id: row.t_id as string,
      slug: row.t_slug as string,
      name: row.t_name as string,
      status: row.t_status as Tenant["status"],
      defaultContactPhone: row.default_contact_phone as string | null,
      address: row.address as string | null,
      timezone: row.timezone as string,
      welcomeMessage: row.welcome_message as string | null,
      description: row.description as string | null,
      history: row.history as string | null,
      contactEmail: row.contact_email as string | null,
      googleMapsLink: row.google_maps_link as string | null,
      morningOpen: row.morning_open as string | null,
      morningClose: row.morning_close as string | null,
      eveningOpen: row.evening_open as string | null,
      eveningClose: row.evening_close as string | null,
      donationInfo: row.donation_info as string | null,
      notifyOnNewEvent: row.notify_on_new_event as boolean,
      notifyOnEventUpdated: row.notify_on_event_updated as boolean,
      notifyOnEventCancelled: row.notify_on_event_cancelled as boolean,
      createdAt: (row.t_created_at as Date).toISOString(),
      updatedAt: (row.t_updated_at as Date).toISOString(),
    },
  };
}

export async function getTenantWebsite(
  tenantId: string,
  client: QueryClient = getPool(),
): Promise<TenantWebsite | null> {
  const { rows } = await client.query<TenantWebsiteRow>(
    `SELECT ${WEBSITE_COLUMNS} FROM tenant_websites WHERE tenant_id = $1`,
    [tenantId],
  );
  return rows[0] ? mapWebsite(rows[0]) : null;
}

export interface UpsertTenantWebsiteInput {
  enabled?: boolean;
  heroTemplate?: WebsiteHeroTemplate;
  theme?: WebsiteTheme;
  displayName?: string | null;
  deityName?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  story?: string | null;
  aboutContent?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  deityMediaId?: string | null;
  heroMediaId?: string | null;
  logoMediaId?: string | null;
  ogMediaId?: string | null;
  languages?: string[];
}

/**
 * Creates the website row on first save and patches it thereafter. Only the
 * keys actually present in `input` are written, so a partial save from the
 * admin's Website settings tab can never blank a field it didn't show.
 */
export async function upsertTenantWebsite(
  tenantId: string,
  input: UpsertTenantWebsiteInput,
  client: QueryClient = getPool(),
): Promise<TenantWebsite> {
  const columns: Record<keyof UpsertTenantWebsiteInput, string> = {
    enabled: "enabled",
    heroTemplate: "hero_template",
    theme: "theme",
    displayName: "display_name",
    deityName: "deity_name",
    heroTitle: "hero_title",
    heroSubtitle: "hero_subtitle",
    story: "story",
    aboutContent: "about_content",
    seoTitle: "seo_title",
    seoDescription: "seo_description",
    deityMediaId: "deity_media_id",
    heroMediaId: "hero_media_id",
    logoMediaId: "logo_media_id",
    ogMediaId: "og_media_id",
    languages: "languages",
  };

  const provided = (Object.keys(columns) as (keyof UpsertTenantWebsiteInput)[]).filter((key) => key in input);
  const params: unknown[] = [tenantId];
  const insertColumns = ["tenant_id"];
  const insertValues = ["$1"];
  const updates: string[] = [];

  for (const key of provided) {
    params.push(input[key]);
    const placeholder = `$${params.length}`;
    insertColumns.push(columns[key]);
    insertValues.push(placeholder);
    updates.push(`${columns[key]} = ${placeholder}`);
  }
  updates.push("updated_at = now()");

  const { rows } = await client.query<TenantWebsiteRow>(
    `INSERT INTO tenant_websites (${insertColumns.join(", ")})
     VALUES (${insertValues.join(", ")})
     ON CONFLICT (tenant_id) DO UPDATE SET ${updates.join(", ")}
     RETURNING ${WEBSITE_COLUMNS}`,
    params,
  );
  return mapWebsite(rows[0]);
}
