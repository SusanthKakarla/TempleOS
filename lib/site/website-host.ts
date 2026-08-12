import { isTenantHostname, normalizeTenantHostname, PRODUCT_DOMAIN } from "@/lib/tenant-domains";

/**
 * A temple's public website and its Tenant Admin Portal share ONE hostname:
 * `sivatemple.trytempleos.com`. There is no separate website domain, and no
 * `TEMPLEOS_WEBSITE_DOMAIN` to configure — a second domain would mean a second
 * Railway custom domain and a second set of DNS records per temple, which is
 * exactly what this architecture avoids.
 *
 * Because the host no longer tells the two surfaces apart, the PATH does. The
 * public website owns a small, closed set of paths (below); everything else on
 * the hostname — `/login`, `/dashboard/*`, `/api/*`, `/donate/*` — belongs to
 * the admin portal and is passed straight through, untouched.
 */
export const WEBSITE_DOMAIN = PRODUCT_DOMAIN;

/** `sivatemple` → `sivatemple.trytempleos.com`. Returns null if the slug can't form a valid hostname. */
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

/**
 * True when the request arrived on a temple's subdomain rather than on the
 * platform's own marketing host. Lookalike and multi-label hosts fail closed —
 * see tenantSubdomainFromHostname.
 */
export function isWebsiteHostname(hostname: string | null, domain: string = WEBSITE_DOMAIN): boolean {
  return isTenantHostname(hostname, domain);
}

/**
 * The public website's complete route surface — an ALLOWLIST, not a set of
 * exclusions.
 *
 * Written this way on purpose: with an exclusion list, every future admin
 * route would be public-by-default until someone remembered to exclude it, and
 * a single omission would rewrite an authenticated page into the temple site.
 * Here a path is admin unless it is named below, so `/login`, `/dashboard/*`,
 * `/api/*`, `/donate/*`, `/super-admin/*` and anything added later are safe
 * without further thought.
 */
export const PUBLIC_WEBSITE_PATHS = [
  "/",
  "/about",
  "/timings",
  "/sevas",
  "/events",
  "/gallery",
  "/slokas",
  "/contact",
] as const;

const PUBLIC_WEBSITE_PATH_SET = new Set<string>(PUBLIC_WEBSITE_PATHS);

/** A single event's detail page: /events/<id>, one segment, no deeper. */
const PUBLIC_EVENT_DETAIL = /^\/events\/[^/]+$/;

export function isPublicWebsitePath(pathname: string): boolean {
  // Trailing slashes are normalised away so `/about/` reaches the same page as
  // `/about` rather than falling through to the admin surface.
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return PUBLIC_WEBSITE_PATH_SET.has(path) || PUBLIC_EVENT_DETAIL.test(path);
}
