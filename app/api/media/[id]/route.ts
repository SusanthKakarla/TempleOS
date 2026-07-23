import { NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { deleteNotificationMedia, getNotificationMediaById } from "@/lib/db/notification-media";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const media = await getNotificationMediaById(session.tenantId, id);
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  return NextResponse.json({ media });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const deleted = await deleteNotificationMedia(session.tenantId, id, session.membershipId);
  if (!deleted) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
