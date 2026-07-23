import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getEventById } from "@/lib/db/events";
import { getTenantById } from "@/lib/db/tenants";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { enqueueEventAnnouncement } from "@/lib/db/event-announcements";
import { countSentNotifications } from "@/lib/db/notifications";
import { processNotifications } from "@/lib/notifications/delivery";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;

  const event = await getEventById(session.tenantId, id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.status !== "published") {
    return NextResponse.json(
      { error: "Only published events can be announced" },
      { status: 400 },
    );
  }

  const tenant = await getTenantById(session.tenantId);
  const whatsappAccount = await getWhatsAppAccountByTenant(session.tenantId);
  if (!tenant || !whatsappAccount) {
    return NextResponse.json(
      { error: "WhatsApp is not connected for this temple yet" },
      { status: 400 },
    );
  }

  // Same eligibility this button has always used (every WhatsApp opt-in, not
  // gated on the event_notifications_enabled toggle the automatic
  // new/updated/cancelled triggers require) — see
  // lib/db/event-announcements.ts's enqueueEventAnnouncement.
  const insertedIds = await enqueueEventAnnouncement(tenant, event, "event_announcement", false);
  if (insertedIds.length === 0) {
    return NextResponse.json({ total: 0, sent: 0, failed: 0 });
  }

  // Awaited rather than after() — this dialog's contract (features/events/announce-dialog.tsx)
  // has always been to report real sent/failed counts once sending is done,
  // so unifying onto the generic queue keeps that contract instead of
  // changing it to a fire-and-forget "queued" response. Any send that
  // doesn't succeed on this first attempt is no longer lost, though — the
  // generic retry sweep (app/api/cron/process-notifications/route.ts) will
  // keep retrying it same as any other notification, which is strictly
  // better than the all-or-nothing single attempt this route used to make.
  await processNotifications(insertedIds);
  const sent = await countSentNotifications(insertedIds);

  return NextResponse.json({ total: insertedIds.length, sent, failed: insertedIds.length - sent });
}
