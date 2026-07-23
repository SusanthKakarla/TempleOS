import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getTenantById, listTenantIdsAndTimezones } from "@/lib/db/tenants";
import {
  listDevoteesEligibleForEventReminders,
  listDevoteesWithAnniversaryToday,
  listDevoteesWithBirthdayToday,
  listFamilyOccasionRemindersDueTomorrow,
  type FamilyOccasionReminder,
} from "@/lib/db/devotees";
import { listPublishedEventsStartingTomorrow } from "@/lib/db/events";
import { listTenantMembershipsForTenant } from "@/lib/db/tenant-memberships";
import { formatTime } from "@/lib/date";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";
import type { SupportedLanguage } from "@/types/db";

/**
 * The single daily scheduler — not tenant/session-scoped, triggered by one
 * Railway Cron schedule (~08:00 daily; not something this route can
 * configure itself). Iterates every tenant, computing "today"/"tomorrow" in
 * that tenant's own timezone (lib/db/tenants.ts's listTenantIdsAndTimezones),
 * and discovers every date-based notification in one pass: birthdays,
 * anniversaries, family occasion reminders, and day-before event reminders
 * (absorbed from the former hourly event-reminders cron — "starting
 * tomorrow" doesn't change within a day, so hourly bought nothing over
 * daily). This route only ever discovers work and enqueues it through the
 * one shared engine — it never builds or sends a message itself.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || !provided) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const OCCASION_LABELS: Record<SupportedLanguage, { birthday: string; anniversary: string }> = {
  en: { birthday: "Birthday", anniversary: "Anniversary" },
  te: { birthday: "పుట్టినరోజు", anniversary: "వివాహ వార్షికోత్సవం" },
};

function formatOccasionList(occasions: FamilyOccasionReminder["occasions"], language: SupportedLanguage): string {
  const labels = OCCASION_LABELS[language] ?? OCCASION_LABELS.en;
  return occasions
    .map((o) => `${o.kind === "birthday" ? "🎂" : "💍"} ${o.name} — ${labels[o.kind]}`)
    .join("\n");
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await listTenantIdsAndTimezones();
  const createdIds: string[] = [];

  for (const { id: tenantId, timezone } of tenants) {
    const tenant = await getTenantById(tenantId);
    if (!tenant) continue;
    const priests = await listTenantMembershipsForTenant(tenantId, { role: "priest", status: "active" });

    const birthdays = await listDevoteesWithBirthdayToday(tenantId, timezone);
    for (const devotee of birthdays) {
      const wish = await enqueueNotification({
        tenantId,
        recipient: { devoteeId: devotee.id },
        notificationType: "birthday_devotee",
        category: "birthday",
        language: devotee.preferredLanguage ?? "en",
        templateVars: { devoteeName: devotee.displayName, templeName: tenant.name },
      });
      createdIds.push(...wish.map((n) => n.id));

      for (const priest of priests) {
        const reminder = await enqueueNotification({
          tenantId,
          recipient: { personId: priest.personId },
          notificationType: "birthday_priest",
          category: "birthday",
          language: priest.preferredUiLanguage ?? "en",
          templateVars: { devoteeName: devotee.displayName, phoneNumber: devotee.whatsappPhone ?? "" },
        });
        createdIds.push(...reminder.map((n) => n.id));
      }
    }

    const anniversaries = await listDevoteesWithAnniversaryToday(tenantId, timezone);
    for (const devotee of anniversaries) {
      const wish = await enqueueNotification({
        tenantId,
        recipient: { devoteeId: devotee.id },
        notificationType: "anniversary_devotee",
        category: "anniversary",
        language: devotee.preferredLanguage ?? "en",
        templateVars: { devoteeName: devotee.displayName, templeName: tenant.name },
      });
      createdIds.push(...wish.map((n) => n.id));

      for (const priest of priests) {
        const reminder = await enqueueNotification({
          tenantId,
          recipient: { personId: priest.personId },
          notificationType: "anniversary_priest",
          category: "anniversary",
          language: priest.preferredUiLanguage ?? "en",
          templateVars: { devoteeName: devotee.displayName, phoneNumber: devotee.whatsappPhone ?? "" },
        });
        createdIds.push(...reminder.map((n) => n.id));
      }
    }

    const familyReminders = await listFamilyOccasionRemindersDueTomorrow(tenantId, timezone);
    for (const reminder of familyReminders) {
      const language = reminder.primaryLanguage ?? "en";
      const created = await enqueueNotification({
        tenantId,
        recipient: { devoteeId: reminder.primaryDevoteeId },
        notificationType: "family_occasion_reminder",
        category: "family",
        language,
        templateVars: {
          templeName: tenant.name,
          occasionList: formatOccasionList(reminder.occasions, language),
        },
      });
      createdIds.push(...created.map((n) => n.id));
    }

    // Absorbed from the former hourly event-reminders cron (see route
    // docstring) — "day-before" reminders for events published by this
    // tenant, sent to eligible devotees plus active admins/priests.
    const eventsStartingTomorrow = await listPublishedEventsStartingTomorrow(tenantId, timezone);
    if (eventsStartingTomorrow.length > 0) {
      const [eligibleDevotees, staff] = await Promise.all([
        listDevoteesEligibleForEventReminders(tenantId),
        listTenantMembershipsForTenant(tenantId, { status: "active" }),
      ]);
      const eligibleStaff = staff.filter((member) => member.roles.includes("admin") || member.roles.includes("priest"));

      for (const event of eventsStartingTomorrow) {
        const baseVars = {
          eventId: event.id,
          eventTitle: event.title,
          eventLocation: event.location ?? tenant.name,
        };

        for (const devotee of eligibleDevotees) {
          const language = devotee.preferredLanguage ?? "en";
          const created = await enqueueNotification({
            tenantId,
            recipient: { devoteeId: devotee.id },
            notificationType: "event_reminder",
            category: "event",
            language,
            templateVars: { ...baseVars, eventTime: formatTime(event.startsAt, language) },
          });
          createdIds.push(...created.map((n) => n.id));
        }

        for (const member of eligibleStaff) {
          const language = member.preferredUiLanguage ?? "en";
          const created = await enqueueNotification({
            tenantId,
            recipient: { personId: member.personId },
            notificationType: "event_reminder",
            category: "event",
            language,
            templateVars: { ...baseVars, eventTime: formatTime(event.startsAt, language) },
          });
          createdIds.push(...created.map((n) => n.id));
        }
      }
    }
  }

  await processNotifications(createdIds);
  return NextResponse.json({ tenantsChecked: tenants.length, notificationsCreated: createdIds.length });
}
