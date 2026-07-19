import { NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getEventNotificationSummary } from "@/lib/db/event-notifications";

export async function GET() {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const summary = await getEventNotificationSummary(session.tenantId);
  return NextResponse.json({ summary });
}
