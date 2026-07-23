import { after, NextRequest, NextResponse } from "next/server";
import {
  requireTenantAdminSession,
  tenantAdminAuthResponse,
} from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { createEvent, listEvents } from "@/lib/db/events";
import { getTenantById } from "@/lib/db/tenants";
import { enqueueEventNotifications } from "@/lib/db/event-notifications";
import { isAutoNotifyEnabled } from "@/lib/events/notification-policy";
import { processEventNotifications } from "@/lib/whatsapp/event-notifications";
import { createEventSchema, eventStatusSchema } from "@/lib/validation/events";

export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "events");
  if (featureBlocked) return featureBlocked;

  const statusParam = req.nextUrl.searchParams.get("status");
  const statusResult = statusParam
    ? eventStatusSchema.safeParse(statusParam)
    : undefined;
  if (statusParam && !statusResult?.success) {
    return NextResponse.json(
      { error: "Invalid status filter" },
      { status: 400 },
    );
  }

  const events = await listEvents(session.tenantId, {
    status: statusResult?.data,
    upcomingOnly: req.nextUrl.searchParams.get("upcoming") === "true",
  });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "events");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = createEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      {
        status: 400,
      },
    );
  }

  const event = await createEvent(session.tenantId, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    location: parsed.data.location ?? null,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt ?? null,
    status: parsed.data.status,
    bannerMediaId: parsed.data.bannerMediaId ?? null,
    createdBy: session.membershipId,
  });

  // An event can be created already-published (the Create dialog's
  // "Published" switch isn't limited to edit mode) — this is the same
  // "new_event" case as a later draft->published transition in
  // app/api/events/[id]/route.ts's PATCH handler, just with no prior state
  // to diff against.
  if (event.status === "published") {
    const tenant = await getTenantById(session.tenantId);
    if (tenant && isAutoNotifyEnabled(tenant, "new_event")) {
      const insertedIds = await enqueueEventNotifications(
        session.tenantId,
        event.id,
        "new_event",
      );
      if (insertedIds.length > 0) {
        after(() => processEventNotifications(insertedIds));
      }
    }
  }

  return NextResponse.json({ event }, { status: 201 });
}
