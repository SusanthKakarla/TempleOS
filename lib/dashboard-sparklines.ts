import type { Event } from "@/types/db";

/**
 * Buckets already-fetched events by day for MetricCard's decorative sparkline.
 * Pure reshape of data the dashboard page already queries — no new I/O.
 */
export function bucketEventsPerDay(events: Event[], days = 7): number[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = new Array(days).fill(0) as number[];
  for (const event of events) {
    const dayIndex = Math.floor(
      (new Date(event.startsAt).getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (dayIndex >= 0 && dayIndex < days) {
      buckets[dayIndex] += 1;
    }
  }
  return buckets;
}
