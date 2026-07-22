import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getNotificationMediaById } from "@/lib/db/notification-media";
import { clearTenantMediaForType, setTenantMediaForType } from "@/lib/db/tenant-notification-media";

// The only automated notification types a tenant can attach a reusable
// image to — event banners are per-event (events.banner_media_id) and
// festival greetings are sent by explicit media id, neither goes through
// this join table.
const LINKABLE_NOTIFICATION_TYPES = ["birthday_devotee", "anniversary_devotee", "donation_thank_you"] as const;

const linkSchema = z.object({
  notificationType: z.enum(LINKABLE_NOTIFICATION_TYPES),
  mediaId: z.string().uuid(),
});

const unlinkSchema = z.object({
  notificationType: z.enum(LINKABLE_NOTIFICATION_TYPES),
});

export async function PUT(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = linkSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const media = await getNotificationMediaById(session.tenantId, parsed.data.mediaId);
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  await setTenantMediaForType(session.tenantId, parsed.data.notificationType, media.id, session.membershipId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = unlinkSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  await clearTenantMediaForType(session.tenantId, parsed.data.notificationType, session.membershipId);
  return NextResponse.json({ ok: true });
}
