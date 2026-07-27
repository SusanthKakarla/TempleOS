/**
 * Minimal in-memory sliding-window limiter for the two new public
 * (unauthenticated) donation routes — the only genuinely new unauthenticated
 * attack surface this feature introduces. Single-instance only (no Redis
 * anywhere in this app's stack today); if the app is ever horizontally
 * scaled, this should move to a shared store — noted as a future
 * recommendation, not built speculatively now.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const hits = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
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
