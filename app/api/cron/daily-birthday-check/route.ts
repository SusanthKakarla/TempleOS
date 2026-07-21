import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getTenantById, listTenantIdsAndTimezones } from "@/lib/db/tenants";
import { listDevoteesWithBirthdayToday } from "@/lib/db/devotees";
import { listTenantMembershipsForTenant } from "@/lib/db/tenant-memberships";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";

/**
 * Not tenant/session-scoped — triggered by a Railway Cron schedule (~08:00
 * daily, configured in the Railway dashboard the same way the existing
 * process-event-notifications schedule is; not something this route can
 * configure itself). Iterates every tenant, computing "today" in that
 * tenant's own timezone (lib/db/tenants.ts's listTenantIdsAndTimezones),
 * and enqueues a birthday wish for each matching devotee plus a birthday
 * pooja reminder for every active priest in that tenant.
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
    const devotees = await listDevoteesWithBirthdayToday(tenantId, timezone);
    if (devotees.length === 0) continue;

    const tenant = await getTenantById(tenantId);
    if (!tenant) continue;
    const priests = await listTenantMembershipsForTenant(tenantId, { role: "priest", status: "active" });

    for (const devotee of devotees) {
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
          templateVars: { devoteeName: devotee.displayName, phoneNumber: devotee.whatsappPhone },
        });
        createdIds.push(...reminder.map((n) => n.id));
      }
    }
  }

  await processNotifications(createdIds);
  return NextResponse.json({ tenantsChecked: tenants.length, notificationsCreated: createdIds.length });
}
