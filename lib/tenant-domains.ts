/**
 * The one hostname every tenant lives on.
 *
 * A temple's subdomain — `sivatemple.trytempleos.com` — serves BOTH surfaces:
 * its public website at the root, and its existing Tenant Admin Portal at
 * `/login`, `/dashboard` and `/api`. There is no second domain, no per-temple
 * deployment, and no environment variable to point the website somewhere else;
 * which surface a request gets is decided by its PATH (see middleware.ts),
 * never by its host.
 *
 * This module is deliberately pure — no database, no server-only imports — so
 * the edge middleware can use it.
 */
export const PRODUCT_DOMAIN = "trytempleos.com";

const GENERIC_TENANT_HOSTNAMES = new Set(["trytempleos.com", "www.trytempleos.com", "localhost"]);

/**
 * Subdomains that belong to the platform rather than to a temple. A tenant can
 * never be provisioned on one, and a request arriving on one is never resolved
 * to a temple — so `www.trytempleos.com` stays the marketing site and
 * `api.trytempleos.com` can never be mistaken for a temple called "api".
 */
export const RESERVED_TENANT_SUBDOMAINS = [
  "www",
  "admin",
  "super-admin",
  "api",
  "localhost",
  "trytempleos",
  "trytempleos.com",
] as const;

const RESERVED_TENANT_SUBDOMAIN_SET = new Set<string>(RESERVED_TENANT_SUBDOMAINS);

export function isReservedTenantSubdomain(value: string): boolean {
  return RESERVED_TENANT_SUBDOMAIN_SET.has(value);
}

export function normalizeTenantHostname(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    const hostname = parsed.hostname;
    return isValidTenantHostname(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

export function isGenericTenantHostname(hostname: string): boolean {
  return GENERIC_TENANT_HOSTNAMES.has(hostname);
}

/**
 * `sivatemple.trytempleos.com` → `sivatemple`. Null for anything that is not a
 * temple subdomain of the product domain.
 *
 * The suffix is matched with its leading dot and the remainder must be a
 * SINGLE label, which is what makes lookalike hosts fail closed:
 *
 *   evil-trytempleos.com                  → null (no `.trytempleos.com` suffix)
 *   sivatemple.trytempleos.com.attacker.com → null (suffix is not at the end)
 *   a.sivatemple.trytempleos.com          → null (two labels, not a tenant)
 *   trytempleos.com / www.trytempleos.com → null (the platform's own site)
 */
export function tenantSubdomainFromHostname(
  hostname: string | null,
  domain: string = PRODUCT_DOMAIN,
): string | null {
  if (!hostname) return null;

  const normalized = normalizeTenantHostname(hostname);
  if (!normalized || isGenericTenantHostname(normalized)) return null;

  const suffix = `.${domain}`;
  if (!normalized.endsWith(suffix)) return null;

  const label = normalized.slice(0, -suffix.length);
  if (!label || label.includes(".")) return null;
  if (isReservedTenantSubdomain(label)) return null;

  return label;
}

/**
 * True when the request arrived on a temple's own subdomain.
 *
 * Note this says nothing about WHICH temple, and nothing about whether one
 * exists — that is a database question, answered server-side from the same
 * hostname. This is only the cheap, pure check that the host is shaped like a
 * tenant's.
 */
export function isTenantHostname(hostname: string | null, domain: string = PRODUCT_DOMAIN): boolean {
  return tenantSubdomainFromHostname(hostname, domain) !== null;
}

function isValidTenantHostname(hostname: string): boolean {
  if (hostname.length > 253 || !hostname.includes(".")) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return false;

  return hostname.split(".").every((label) => {
    return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
  });
}
