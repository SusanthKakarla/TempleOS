import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { markConversationRead } from "@/lib/db/whatsapp-conversations";

interface RouteParams {
  params: Promise<{ devoteeId: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { devoteeId } = await params;
  await markConversationRead(session.tenantId, devoteeId);
  return NextResponse.json({ ok: true });
}
