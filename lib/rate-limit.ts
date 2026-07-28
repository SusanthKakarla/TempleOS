/**
 * Minimal in-memory sliding-window limiter — shared by every unauthenticated
 * or abuse-sensitive route in the app (public donation checkout, login
 * session creation, media upload). Single-instance only (no Redis anywhere
 * in this app's stack today); if the app is ever horizontally scaled, this
 * should move to a shared store — noted as a future recommendation, not
 * built speculatively now.
 */
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS_PER_WINDOW = 20;

const hits = new Map<string, number[]>();

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

export function isRateLimited(key: string, options: RateLimitOptions = {}): boolean {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS_PER_WINDOW;

  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    hits.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return false;
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
