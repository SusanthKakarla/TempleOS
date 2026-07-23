import { after, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getNotificationMediaById } from "@/lib/db/notification-media";
import { getTenantById } from "@/lib/db/tenants";
import { enqueueFestivalGreeting } from "@/lib/db/festival-greetings";
import { processNotifications } from "@/lib/notifications/delivery";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const [media, tenant] = await Promise.all([
    getNotificationMediaById(session.tenantId, id),
    getTenantById(session.tenantId),
  ]);
  if (!media || media.category !== "festival_greeting") {
    return NextResponse.json({ error: "Festival banner not found" }, { status: 404 });
  }
  if (!tenant) {
    return NextResponse.json({ error: "Temple not found" }, { status: 404 });
  }

  const insertedIds = await enqueueFestivalGreeting(session.tenantId, tenant.name, media.id, media.title ?? "");
  if (insertedIds.length > 0) {
    after(() => processNotifications(insertedIds));
  }

  return NextResponse.json({ sentTo: insertedIds.length });
}
