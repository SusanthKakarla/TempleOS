import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getTenantById, listTenantIdsAndTimezones } from "@/lib/db/tenants";
import { listDevoteesEligibleForEventReminders } from "@/lib/db/devotees";
import { listPublishedEventsStartingTomorrow } from "@/lib/db/events";
import { listTenantMembershipsForTenant } from "@/lib/db/tenant-memberships";
import { formatTime } from "@/lib/date";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";

/**
 * Not tenant/session-scoped — triggered by a Railway Cron schedule (hourly,
 * configured in the Railway dashboard, not something this route can
 * configure itself). Distinct from the existing new/updated/cancelled event
 * pipeline (event_notifications, untouched) — this is strictly the new
 * "day-before" reminder type, sent once per event (see
 * listPublishedEventsStartingTomorrow's dedup) to eligible devotees plus
 * active admins/priests of that tenant.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || !provided) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await listTenantIdsAndTimezones();
  const createdIds: string[] = [];

  for (const { id: tenantId, timezone } of tenants) {
    const events = await listPublishedEventsStartingTomorrow(tenantId, timezone);
    if (events.length === 0) continue;

    const tenant = await getTenantById(tenantId);
    if (!tenant) continue;
    const [devotees, staff] = await Promise.all([
      listDevoteesEligibleForEventReminders(tenantId),
      listTenantMembershipsForTenant(tenantId, { status: "active" }),
    ]);
    const eligibleStaff = staff.filter((member) => member.roles.includes("admin") || member.roles.includes("priest"));

    for (const event of events) {
      const baseVars = {
        eventId: event.id,
        eventTitle: event.title,
        eventLocation: event.location ?? tenant.name,
      };

      for (const devotee of devotees) {
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

  await processNotifications(createdIds);
  return NextResponse.json({ tenantsChecked: tenants.length, notificationsCreated: createdIds.length });
}
