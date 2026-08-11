export const DEFAULT_PAGE_SIZE = 10;

/**
 * Ceiling on rows in a single response — a payload/query guard, not a cap on
 * how many records may exist. Callers can page through any number of rows.
 */
export const MAX_PAGE_SIZE = 100;

export function parsePageParam(raw?: string): number {
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parsePageSizeParam(raw?: string): number {
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

export function computeOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function computeTotalPages(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
