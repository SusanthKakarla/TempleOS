import { getPool } from "@/lib/db/pool";
import type { QueryClient } from "@/lib/db/query-client";

/**
 * Read-only projections of the temple's operational data for its public site.
 *
 * Every query is scoped by `tenant_id` and takes it as a bound parameter that
 * the caller obtained from hostname resolution — never from anything the
 * browser sent. These are deliberately narrow SELECTs: the public site should
 * not be able to surface a column simply because someone added it to an admin
 * table later.
 */

export interface SiteSeva {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  duration: string | null;
  availableDays: string[];
}

export async function listSiteSevas(tenantId: string, client: QueryClient = getPool()): Promise<SiteSeva[]> {
  const { rows } = await client.query<{
    id: string;
    name: string;
    description: string | null;
    price: string | null;
    duration: string | null;
    available_days: string[];
  }>(
    `SELECT id, name, description, price, duration, available_days
     FROM temple_sevas
     WHERE tenant_id = $1
     ORDER BY display_order ASC, name ASC`,
    [tenantId],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    duration: row.duration,
    availableDays: row.available_days ?? [],
  }));
}

export interface SiteEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  imageUrl: string | null;
}

/** Only `published` events reach the public site; drafts stay in the admin portal. */
export async function listSiteEvents(
  tenantId: string,
  opts: { upcomingOnly?: boolean; limit?: number } = {},
  client: QueryClient = getPool(),
): Promise<SiteEvent[]> {
  const params: unknown[] = [tenantId];
  let where = "e.tenant_id = $1 AND e.status = 'published'";
  if (opts.upcomingOnly) where += " AND (e.ends_at IS NULL AND e.starts_at >= now() - INTERVAL '6 hours' OR e.ends_at >= now())";
  let sql = `SELECT e.id, e.title, e.description, e.location, e.starts_at, e.ends_at, m.image_url
     FROM events e
     LEFT JOIN notification_media m ON m.id = e.banner_media_id AND m.tenant_id = e.tenant_id
     WHERE ${where}
     ORDER BY e.starts_at ASC`;
  if (opts.limit) {
    params.push(opts.limit);
    sql += ` LIMIT $${params.length}`;
  }

  const { rows } = await client.query<{
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    starts_at: Date;
    ends_at: Date | null;
    image_url: string | null;
  }>(sql, params);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at?.toISOString() ?? null,
    imageUrl: row.image_url,
  }));
}

/** Tenant id is part of the WHERE clause, not just the join, so an event id from another temple returns nothing. */
export async function getSiteEvent(
  tenantId: string,
  eventId: string,
  client: QueryClient = getPool(),
): Promise<SiteEvent | null> {
  const { rows } = await client.query<{
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    starts_at: Date;
    ends_at: Date | null;
    image_url: string | null;
  }>(
    `SELECT e.id, e.title, e.description, e.location, e.starts_at, e.ends_at, m.image_url
     FROM events e
     LEFT JOIN notification_media m ON m.id = e.banner_media_id AND m.tenant_id = e.tenant_id
     WHERE e.tenant_id = $1 AND e.id = $2 AND e.status = 'published'`,
    [tenantId, eventId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at?.toISOString() ?? null,
    imageUrl: row.image_url,
  };
}

export interface SiteImage {
  id: string;
  url: string;
  title: string | null;
  width: number | null;
  height: number | null;
}

export async function listSiteGallery(
  tenantId: string,
  limit?: number,
  client: QueryClient = getPool(),
): Promise<SiteImage[]> {
  const params: unknown[] = [tenantId];
  let sql = `SELECT id, image_url, title, width, height
     FROM notification_media
     WHERE tenant_id = $1 AND category = 'temple_gallery'
     ORDER BY created_at DESC`;
  if (limit) {
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }
  const { rows } = await client.query<{
    id: string;
    image_url: string;
    title: string | null;
    width: number | null;
    height: number | null;
  }>(sql, params);
  return rows.map((row) => ({ id: row.id, url: row.image_url, title: row.title, width: row.width, height: row.height }));
}

/**
 * Resolves the website's configured media ids to URLs in one query. Each id is
 * matched against this tenant's own media, so a website row pointing at
 * another temple's image (only reachable by direct DB edit) resolves to null
 * rather than leaking it.
 */
export async function resolveSiteMediaUrls(
  tenantId: string,
  ids: { deity: string | null; hero: string | null; logo: string | null; og: string | null },
  client: QueryClient = getPool(),
): Promise<{ deityImageUrl: string | null; heroImageUrl: string | null; logoUrl: string | null; ogImageUrl: string | null }> {
  const wanted = [ids.deity, ids.hero, ids.logo, ids.og].filter((id): id is string => Boolean(id));
  if (wanted.length === 0) {
    return { deityImageUrl: null, heroImageUrl: null, logoUrl: null, ogImageUrl: null };
  }

  const { rows } = await client.query<{ id: string; image_url: string }>(
    `SELECT id, image_url FROM notification_media WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
    [tenantId, wanted],
  );
  const byId = new Map(rows.map((row) => [row.id, row.image_url]));
  const url = (id: string | null) => (id ? (byId.get(id) ?? null) : null);

  return {
    deityImageUrl: url(ids.deity),
    heroImageUrl: url(ids.hero),
    logoUrl: url(ids.logo),
    ogImageUrl: url(ids.og),
  };
}

export interface SiteSocialLink {
  platform: string;
  url: string;
}

export async function listSiteSocialLinks(
  tenantId: string,
  client: QueryClient = getPool(),
): Promise<SiteSocialLink[]> {
  const { rows } = await client.query<{ platform: string; url: string }>(
    `SELECT platform, url FROM temple_social_links WHERE tenant_id = $1 ORDER BY platform ASC`,
    [tenantId],
  );
  return rows;
}

/**
 * Short notices for the header ticker: the temple's own upcoming special days.
 * Reuses the existing table the admin already maintains for the chatbot —
 * there is no website-only announcement store.
 */
export interface SiteAnnouncement {
  occasion: string;
  /** Calendar date, "YYYY-MM-DD" — a DATE column, never compared as an instant. */
  date: string;
  isClosed: boolean;
}

export async function listSiteAnnouncements(
  tenantId: string,
  client: QueryClient = getPool(),
): Promise<SiteAnnouncement[]> {
  const { rows } = await client.query<{ occasion: string; date: string; is_closed: boolean }>(
    `SELECT occasion, date::text AS date, is_closed
     FROM temple_special_days
     WHERE tenant_id = $1 AND date >= (now() AT TIME ZONE 'UTC')::date - INTERVAL '1 day'
     ORDER BY date ASC
     LIMIT 6`,
    [tenantId],
  );
  return rows
    .filter((row) => row.occasion.trim().length > 0)
    .map((row) => ({ occasion: row.occasion.trim(), date: row.date, isClosed: row.is_closed }));
}
