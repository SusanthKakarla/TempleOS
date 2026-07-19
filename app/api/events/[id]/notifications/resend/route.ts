import { after, NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { resendFailedEventNotifications } from "@/lib/db/event-notifications";
import { processEventNotifications } from "@/lib/whatsapp/event-notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Retries only rows currently in `failed` status for this event — distinct
 * from the manual "Send Announcement" flow (app/api/events/[id]/announce),
 * which re-broadcasts to every opted-in devotee regardless of prior delivery.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const insertedIds = await resendFailedEventNotifications(session.tenantId, id);
  if (insertedIds.length > 0) {
    after(() => processEventNotifications(insertedIds));
  }

  return NextResponse.json({ resent: insertedIds.length });
}
