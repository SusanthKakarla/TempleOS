import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { listRecentEventNotifications } from "@/lib/db/event-notifications";

export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const eventId = req.nextUrl.searchParams.get("eventId") ?? undefined;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const notifications = await listRecentEventNotifications(session.tenantId, { eventId, limit });
  return NextResponse.json({ notifications });
}
