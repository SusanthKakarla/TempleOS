export const DEFAULT_PAGE_SIZE = 20;

export function parsePageParam(raw?: string): number {
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function computeOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function computeTotalPages(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
