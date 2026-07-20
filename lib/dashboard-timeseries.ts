interface DayBucket {
  date: string;
}

/**
 * Backfills missing days with `zeroValue` so a chart's x-axis stays continuous
 * even when the underlying query returned sparse rows. Pure reshape of
 * already-fetched data — no DB call, mirrors lib/dashboard-sparklines.ts.
 *
 * Day keys are UTC-anchored (matching Postgres's `date_trunc('day', ...)` on a
 * TIMESTAMPTZ column plus `.toISOString()` in the query layer) — building them
 * from local calendar fields would drift by a day in any non-UTC timezone.
 */
export function zeroFillDays<T extends DayBucket>(rows: T[], days: number, zeroValue: Omit<T, "date">): T[] {
  const byDate = new Map(rows.map((row) => [row.date.slice(0, 10), row]));
  const result: T[] = [];
  const now = new Date();
  const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(startOfTodayUtc - i * oneDayMs).toISOString().slice(0, 10);
    result.push(byDate.get(key) ?? ({ date: key, ...zeroValue } as T));
  }

  return result;
}
