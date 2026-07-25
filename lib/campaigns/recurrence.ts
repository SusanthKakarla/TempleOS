export const RECURRENCE_RULES = ["daily", "weekly", "monthly"] as const;
export type RecurrenceRule = (typeof RECURRENCE_RULES)[number];

/**
 * Pure — unit tested directly, no DB. Deliberately simple (no cron-expression
 * parser/library): a campaign's recurrence is one of three fixed cadences,
 * not an arbitrary schedule, so a plain switch is the whole implementation.
 * Returns null for an unrecognized rule so the caller can leave the
 * campaign without a next run rather than silently mis-scheduling it.
 */
export function computeNextRunAt(rule: string, from: Date): Date | null {
  const next = new Date(from);
  switch (rule) {
    case "daily":
      next.setDate(next.getDate() + 1);
      return next;
    case "weekly":
      next.setDate(next.getDate() + 7);
      return next;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      return next;
    default:
      return null;
  }
}
