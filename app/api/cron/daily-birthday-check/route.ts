import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getTenantById, listTenantIdsAndTimezones } from "@/lib/db/tenants";
import {
  listDevoteesWithAnniversaryToday,
  listDevoteesWithBirthdayToday,
  listFamilyOccasionRemindersDueTomorrow,
  type FamilyOccasionReminder,
} from "@/lib/db/devotees";
import { listTenantMembershipsForTenant } from "@/lib/db/tenant-memberships";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";
import type { SupportedLanguage } from "@/types/db";

/**
 * Not tenant/session-scoped — triggered by a Railway Cron schedule (~08:00
 * daily, configured in the Railway dashboard the same way the existing
 * process-event-notifications schedule is; not something this route can
 * configure itself). Iterates every tenant, computing "today"/"tomorrow" in
 * that tenant's own timezone (lib/db/tenants.ts's listTenantIdsAndTimezones).
 *
 * Extended (Family Relationship Management) to also check wedding
 * anniversaries and roll up each family's tomorrow occasions into one
 * reminder to the family head — kept in this same route/URL rather than a
 * new one, since a Railway Cron job is already pointed at this exact path.
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
  }

  await processNotifications(createdIds);
  return NextResponse.json({ tenantsChecked: tenants.length, notificationsCreated: createdIds.length });
}
