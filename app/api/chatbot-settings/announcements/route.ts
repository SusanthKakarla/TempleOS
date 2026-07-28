import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { enqueueTempleAnnouncement } from "@/lib/db/manual-broadcasts";
import { processNotifications } from "@/lib/notifications/delivery";

const bodySchema = z.object({ message: z.string().trim().min(1, "Message is required").max(1000) });

/** Sends a one-off admin-typed WhatsApp message to every opted-in devotee — see lib/db/manual-broadcasts.ts. */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "notifications");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const insertedIds = await enqueueTempleAnnouncement(session.tenantId, parsed.data.message);
  if (insertedIds.length > 0) {
    after(() => processNotifications(insertedIds));
  }

  return NextResponse.json({ sentTo: insertedIds.length });
}
