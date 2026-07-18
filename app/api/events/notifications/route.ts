import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { listRecentEventNotifications } from "@/lib/db/event-notifications";

export async function GET(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = req.nextUrl.searchParams.get("eventId") ?? undefined;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const notifications = await listRecentEventNotifications(session.tenantId, { eventId, limit });
  return NextResponse.json({ notifications });
}
