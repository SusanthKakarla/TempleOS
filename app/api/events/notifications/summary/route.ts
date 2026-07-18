import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { getEventNotificationSummary } from "@/lib/db/event-notifications";

export async function GET() {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getEventNotificationSummary(session.tenantId);
  return NextResponse.json({ summary });
}
