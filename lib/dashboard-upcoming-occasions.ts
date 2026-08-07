import { listUpcomingBirthdays, listUpcomingAnniversaries } from "@/lib/db/devotees";

export type UpcomingOccasionKind = "birthday" | "anniversary";

export interface UpcomingOccasion {
  devoteeId: string;
  kind: UpcomingOccasionKind;
  name: string;
  phone: string | null;
  familyName: string | null;
  /** This cycle's actual occurrence date (YYYY-MM-DD), tenant-local. */
  occurrenceDate: string;
  daysUntil: number;
  /** Birthday only — years since date_of_birth's year, as of this occurrence. */
  age: number | null;
  /** Anniversary only — years since wedding_anniversary's year, as of this occurrence. */
  years: number | null;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * The single shared "Upcoming Events" service the dashboard widget (and any
 * future consumer, e.g. a WhatsApp birthday-wish campaign) should call —
 * every birthday/anniversary date computation lives here, once. Callers
 * never re-derive age/years/daysUntil themselves.
 */
export async function getUpcomingOccasions(tenantId: string, timezone: string, days = 30): Promise<UpcomingOccasion[]> {
  const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  const [birthdays, anniversaries] = await Promise.all([
    listUpcomingBirthdays(tenantId, timezone, days),
    listUpcomingAnniversaries(tenantId, timezone, days),
  ]);

  const occasions: UpcomingOccasion[] = [
    ...birthdays.map((row) => ({
      devoteeId: row.id,
      kind: "birthday" as const,
      name: row.display_name,
      phone: row.whatsapp_phone,
      familyName: row.family_name,
      occurrenceDate: row.next_occurrence,
      daysUntil: daysBetween(todayIso, row.next_occurrence),
      age: new Date(row.next_occurrence).getUTCFullYear() - new Date(row.occasion_date).getUTCFullYear(),
      years: null,
    })),
    ...anniversaries.map((row) => ({
      devoteeId: row.id,
      kind: "anniversary" as const,
      name: row.display_name,
      phone: row.whatsapp_phone,
      familyName: row.family_name,
      occurrenceDate: row.next_occurrence,
      daysUntil: daysBetween(todayIso, row.next_occurrence),
      age: null,
      years: new Date(row.next_occurrence).getUTCFullYear() - new Date(row.occasion_date).getUTCFullYear(),
    })),
  ];

  occasions.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
  return occasions;
}
