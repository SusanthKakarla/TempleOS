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

function isValidTenantHostname(hostname: string): boolean {
  if (hostname.length > 253 || !hostname.includes(".")) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return false;

  return hostname.split(".").every((label) => {
    return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
  });
}
