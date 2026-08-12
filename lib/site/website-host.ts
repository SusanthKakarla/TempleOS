import { normalizeTenantHostname } from "@/lib/tenant-domains";

/**
 * The domain every public temple website hangs off, kept separate from the
 * admin portal's PRODUCT_DOMAIN so the two can never collide: a request for
 * `sivatemple.templos.in` can only ever be a public website, and
 * `sivatemple.trytempleos.com` can only ever be the admin portal. That
 * separation is what lets tenant resolution reject an admin host outright
 * instead of guessing which surface the visitor wanted.
 *
 * Overridable per environment so staging can serve websites from its own
 * domain without a code change.
 */
export const WEBSITE_DOMAIN = process.env.TEMPLEOS_WEBSITE_DOMAIN?.trim() || "templos.in";

/** `sivatemple` → `sivatemple.templos.in`. Returns null if the slug can't form a valid hostname. */
export function buildWebsiteHostname(slug: string, domain: string = WEBSITE_DOMAIN): string | null {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) return null;
  return normalizeTenantHostname(`${trimmed}.${domain}`);
}

/**
 * The hostname of the incoming request, taken from the proxy headers Next
 * populates. Only ever used as a lookup key against tenant_domains — never
 * trusted as an identity in itself.
 */
export function resolveRequestHostname(headers: { get(name: string): string | null }): string | null {
  const raw = headers.get("x-forwarded-host") ?? headers.get("host");
  const first = raw?.split(",")[0]?.trim();
  if (!first) return null;
  return normalizeTenantHostname(first.split(":")[0] ?? "");
}

/** True when the request arrived on the public-website domain rather than the admin/product domain. */
export function isWebsiteHostname(hostname: string | null, domain: string = WEBSITE_DOMAIN): boolean {
  if (!hostname) return false;
  return hostname.endsWith(`.${domain}`) && hostname !== domain;
}
