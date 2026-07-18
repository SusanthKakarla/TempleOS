import { after, NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { deleteEvent, getEventById, updateEvent } from "@/lib/db/events";
import { getTenantById } from "@/lib/db/tenants";
import { enqueueEventNotifications } from "@/lib/db/event-notifications";
import {
  decideEventNotificationType,
  isAutoNotifyEnabled,
} from "@/lib/events/notification-policy";
import { processEventNotifications } from "@/lib/whatsapp/event-notifications";
import { updateEventSchema } from "@/lib/validation/events";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const priorEvent = await getEventById(session.tenantId, id);
  if (!priorEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      {
        status: 400,
      },
    );
  }

  const event = await updateEvent(session.tenantId, id, parsed.data);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Automatic WhatsApp notification (see migrations/007_event_notifications.sql).
  // Queue rows are inserted synchronously (fast, bounded) so state is durable
  // even if the process restarts before after() runs; the actual WhatsApp
  // sends happen post-response via after() so publishing/updating an event
  // never waits on Graph API calls. The Railway Cron sweep
  // (app/api/cron/process-event-notifications/route.ts) is the durable
  // catch-all for anything after() misses.
  const notificationType = decideEventNotificationType(priorEvent, event);
  if (notificationType) {
    const tenant = await getTenantById(session.tenantId);
    if (tenant && isAutoNotifyEnabled(tenant, notificationType)) {
      const insertedIds = await enqueueEventNotifications(
        session.tenantId,
        event.id,
        notificationType,
      );
      if (insertedIds.length > 0) {
        after(() => processEventNotifications(insertedIds));
      }
    }
  }

  return NextResponse.json({ event });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const deleted = await deleteEvent(session.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
